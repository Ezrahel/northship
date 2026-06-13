import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createXai } from "@ai-sdk/xai";
import { generateText, Output, type LanguageModel } from "ai";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { aiProviderName, defaultAiModel, isAiProviderModel, type AiProviderId } from "../shared/ai-providers.js";
import { db } from "./db.js";
import { deploymentLogs, deployments, projectGroups, services, type Deployment, type DeploymentLog, type Service } from "./schema.js";
import { getUserAiSettings } from "./user-settings.js";

const maxLogLines = 220;
const maxLogChars = 30000;

const deploymentFailureExplanationSchema = z.object({
  summary: z.string().min(1),
  cause: z.string().min(1),
  suggestedFix: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  commands: z.array(z.string()).max(5).default([]),
  relatedLogLines: z.array(z.string()).max(8).default([])
});

export type DeploymentFailureExplanation = z.infer<typeof deploymentFailureExplanationSchema> & {
  provider: AiProviderId;
  providerName: string;
  model: string;
};

export class DeploymentFailureExplanationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DeploymentFailureExplanationError";
    this.status = status;
  }
}

function modelForProvider(providerId: AiProviderId, apiKey: string, modelId: string): LanguageModel {
  if (providerId === "openai") return createOpenAI({ apiKey })(modelId);
  if (providerId === "anthropic") return createAnthropic({ apiKey })(modelId);
  if (providerId === "google") return createGoogleGenerativeAI({ apiKey })(modelId);
  if (providerId === "mistral") return createMistral({ apiKey })(modelId);
  if (providerId === "groq") return createGroq({ apiKey })(modelId);
  if (providerId === "deepseek") return createDeepSeek({ apiKey })(modelId);
  if (providerId === "xai") return createXai({ apiKey }).responses(modelId);

  return createOpenAICompatible({
    name: "moonshot",
    apiKey,
    baseURL: "https://api.moonshot.ai/v1"
  })(modelId);
}

function formatDeployment(deployment: Deployment, service: Service) {
  return [
    `Service: ${service.name}`,
    `Runtime mode: ${service.runtimeMode}`,
    `Repository: ${service.repoFullName || service.repoUrl || "unknown"}`,
    `Branch: ${service.branch}`,
    `Root directory: ${service.rootDir || "/"}`,
    `Install command: ${service.installCommand || "auto"}`,
    `Build command: ${service.buildCommand || "auto"}`,
    `Start command: ${service.startCommand || "auto"}`,
    `Static output: ${service.staticOutput || "none"}`,
    `Container port: ${service.internalPort}`,
    `Deployment status: ${deployment.status}`,
    `Trigger: ${deployment.trigger}`,
    `Commit: ${deployment.commitSha || "unknown"}`,
    `Started: ${deployment.startedAt || "unknown"}`,
    `Finished: ${deployment.finishedAt || "unknown"}`
  ].join("\n");
}

function formatLogs(logs: DeploymentLog[]) {
  const selected = logs.slice(-maxLogLines);
  const text = selected.map((log) => `[${log.stream}] ${log.line}`).join("\n");
  if (text.length <= maxLogChars) return text;
  return text.slice(text.length - maxLogChars);
}

function buildPrompt(deployment: Deployment, service: Service, logs: DeploymentLog[]) {
  return `You are helping diagnose a failed Northship deployment.

Explain the failure in plain, specific language for the app owner. Focus on what happened and the smallest likely fix.

Rules:
- Use only the deployment metadata and logs below.
- Do not invent files, commands, ports, packages, or environment variables that are not supported by the logs.
- Prefer concrete fixes over generic advice.
- If evidence is weak, say so and set confidence to low.
- Keep summary, cause, and suggestedFix each under 80 words.
- relatedLogLines should quote the shortest relevant log lines exactly as they appear below.
- commands should contain only commands or setting changes the user can plausibly run or make.

Deployment metadata:
${formatDeployment(deployment, service)}

Deployment logs:
${formatLogs(logs) || "No deployment logs were captured."}`;
}

export async function explainDeploymentFailure(
  deploymentId: string,
  options: { providerId?: AiProviderId; modelId?: string } = {}
): Promise<DeploymentFailureExplanation> {
  const deployment = db.select().from(deployments).where(eq(deployments.id, deploymentId)).get();
  if (!deployment) {
    throw new DeploymentFailureExplanationError("Deployment not found.", 404);
  }
  if (deployment.status !== "failed") {
    throw new DeploymentFailureExplanationError("AI explanations are available after a deployment fails.", 409);
  }

  const service = db.select().from(services).where(eq(services.id, deployment.serviceId)).get();
  if (!service) {
    throw new DeploymentFailureExplanationError("Service not found for this deployment.", 404);
  }

  const project = db.select().from(projectGroups).where(eq(projectGroups.id, service.projectId)).get();
  const aiSettings = project?.ownerUserId ? getUserAiSettings(project.ownerUserId) : null;
  const providerId = options.providerId || aiSettings?.defaultProvider || "";
  if (!providerId) {
    throw new DeploymentFailureExplanationError("Choose a default AI provider in Settings before explaining deployment failures.", 409);
  }

  const providerSettings = aiSettings?.providers[providerId];
  if (!providerSettings?.apiKey) {
    throw new DeploymentFailureExplanationError(`${aiProviderName(providerId)} API key is missing.`, 409);
  }

  const requestedModelId = options.modelId?.trim() || "";
  if (requestedModelId && !isAiProviderModel(providerId, requestedModelId)) {
    throw new DeploymentFailureExplanationError(`${requestedModelId} is not a supported ${aiProviderName(providerId)} model.`);
  }

  const defaultProviderModel = providerId === aiSettings?.defaultProvider ? aiSettings?.defaultModel || "" : "";
  const modelId = requestedModelId || defaultProviderModel || providerSettings.selectedModel || defaultAiModel(providerId);
  const logs = db.select().from(deploymentLogs).where(eq(deploymentLogs.deploymentId, deploymentId)).orderBy(asc(deploymentLogs.id)).all();
  const providerOptions = providerId === "xai" ? { xai: { store: false } } : undefined;

  const result = await generateText({
    model: modelForProvider(providerId, providerSettings.apiKey, modelId),
    temperature: 0.2,
    maxOutputTokens: 900,
    prompt: buildPrompt(deployment, service, logs),
    providerOptions,
    output: Output.object({
      schema: deploymentFailureExplanationSchema,
      name: "deployment_failure_explanation"
    })
  });

  return {
    ...deploymentFailureExplanationSchema.parse(result.output),
    provider: providerId,
    providerName: aiProviderName(providerId),
    model: modelId
  };
}
