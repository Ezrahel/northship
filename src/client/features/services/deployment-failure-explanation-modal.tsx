import { AiBrain01Icon, AlertCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { api, type AiProviderStatus, type AiSettingsStatus, type Deployment, type DeploymentFailureExplanation } from "../../api";
import type { AiProviderId } from "../../../shared/ai-providers";
import { ModalShell } from "../../components/modals/modal-shell";
import { AppIcon, statusClass } from "../../components/ui/primitives";
import { shortSha } from "../../lib/format";
import { DeploymentFailureCommand } from "./deployment-failure-command";
import { DeploymentFailureModelPicker } from "./deployment-failure-model-picker";

function confidenceStatus(confidence: DeploymentFailureExplanation["confidence"]) {
  if (confidence === "high") return "active";
  if (confidence === "medium") return "building";
  return "failed";
}

const loadingMessages = [
  "Reading deployment output...",
  "Finding the first failing step...",
  "Checking build commands and service settings...",
  "Pulling out the relevant log lines...",
  "Preparing the likely cause...",
  "Drafting the suggested fix..."
];

function connectedAiProviders(aiSettings: AiSettingsStatus | null) {
  return aiSettings?.providers.filter((provider) => provider.connected) ?? [];
}

function initialProvider(aiSettings: AiSettingsStatus) {
  const connectedProviders = connectedAiProviders(aiSettings);
  return connectedProviders.find((provider) => provider.id === aiSettings.defaultProvider) ?? connectedProviders[0] ?? null;
}

function modelForProvider(provider: AiProviderStatus | null, aiSettings: AiSettingsStatus | null) {
  if (!provider) return "";
  if (provider.id === aiSettings?.defaultProvider && aiSettings.defaultModel) return aiSettings.defaultModel;
  return provider.selectedModel || provider.models[0]?.id || "";
}

export function DeploymentFailureExplanationModal({
  deployment,
  open,
  onClose
}: {
  deployment: Deployment | null;
  open: boolean;
  onClose: () => void;
}) {
  const [explanation, setExplanation] = useState<DeploymentFailureExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [aiSettings, setAiSettings] = useState<AiSettingsStatus | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<AiProviderId | "">("");
  const [selectedModel, setSelectedModel] = useState("");
  const deploymentId = open && deployment ? deployment.id : null;
  const aiProviders = connectedAiProviders(aiSettings);
  const selectedProvider = aiProviders.find((provider) => provider.id === selectedProviderId) ?? null;

  useEffect(() => {
    if (!open) {
      setAiSettings(null);
      setSelectedProviderId("");
      setSelectedModel("");
      return;
    }

    let cancelled = false;

    void api.aiSettings()
      .then((response) => {
        if (cancelled) return;
        const provider = initialProvider(response.ai);
        setAiSettings(response.ai);
        setSelectedProviderId(provider?.id ?? "");
        setSelectedModel(modelForProvider(provider, response.ai));
        setError(provider ? "" : "Save an AI provider API key in Settings before explaining deployment failures.");
      })
      .catch((issue) => {
        if (!cancelled) setError(issue instanceof Error ? issue.message : "Could not load AI providers.");
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!deploymentId || !selectedProviderId || !selectedModel) {
      if (!deploymentId) {
        setExplanation(null);
        setError("");
      }
      setExplanation(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setExplanation(null);
    setLoadingMessageIndex(0);

    void api.explainDeploymentFailure(deploymentId, { providerId: selectedProviderId, model: selectedModel })
      .then((response) => {
        if (!cancelled) setExplanation(response.explanation);
      })
      .catch((issue) => {
        if (!cancelled) setError(issue instanceof Error ? issue.message : "Could not explain this deployment failure.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deploymentId, selectedProviderId, selectedModel]);

  useEffect(() => {
    if (!loading) return;

    const interval = window.setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % loadingMessages.length);
    }, 1800);

    return () => {
      window.clearInterval(interval);
    };
  }, [loading]);

  function changeProviderModel(providerId: AiProviderId, modelId: string) {
    setSelectedProviderId(providerId);
    setSelectedModel(modelId);
  }

  return (
    <ModalShell
      open={open}
      title="What happened?"
      meta={deployment ? `Deployment ${shortSha(deployment.commitSha)}` : undefined}
      icon={AiBrain01Icon}
      onClose={onClose}
      width="max-w-4xl"
    >
      {aiProviders.length > 0 ? (
        <DeploymentFailureModelPicker
          providers={aiProviders}
          selectedProviderId={selectedProviderId}
          selectedModel={selectedModel}
          disabled={loading || !selectedProvider}
          onSelect={changeProviderModel}
        />
      ) : null}

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="border border-zinc-800 bg-zinc-900/55 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500"
        >
          {loadingMessages[loadingMessageIndex]}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 border border-rose-500/35 bg-rose-950/25 px-4 py-3 text-sm leading-6 text-rose-100">
          <AppIcon icon={AlertCircleIcon} size={17} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      ) : null}

      {explanation ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-950/45 px-4 py-3">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {explanation.providerName} / {explanation.model}
            </div>
            <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass(confidenceStatus(explanation.confidence))}`}>
              {explanation.confidence} confidence
            </span>
          </div>

          <section className="border border-zinc-800 bg-zinc-950/45 p-4">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Summary</div>
            <p className="mt-2 text-sm leading-6 text-zinc-100">{explanation.summary}</p>
          </section>

          <section className="border border-zinc-800 bg-zinc-950/45 p-4">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Likely cause</div>
            <p className="mt-2 text-sm leading-6 text-zinc-100">{explanation.cause}</p>
          </section>

          <section className="border border-[#4FB8B2]/30 bg-[#4FB8B2]/10 p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7fe3dd]">
              <AppIcon icon={CheckmarkCircle02Icon} size={15} />
              Suggested fix
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-100">{explanation.suggestedFix}</p>
          </section>

          {explanation.commands.length > 0 ? (
            <section className="border border-zinc-800 bg-zinc-950/45 p-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Commands / changes</div>
              <div className="mt-3 space-y-2">
                {explanation.commands.map((command, index) => (
                  <DeploymentFailureCommand key={`${command}-${index}`} command={command} />
                ))}
              </div>
            </section>
          ) : null}

          {explanation.relatedLogLines.length > 0 ? (
            <section className="border border-zinc-800 bg-zinc-950/45 p-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Relevant logs</div>
              <pre className="mt-3 max-h-44 overflow-y-auto whitespace-pre-wrap break-all border border-zinc-800 bg-zinc-900/70 px-3 py-2 font-mono text-xs leading-5 text-zinc-300">
                {explanation.relatedLogLines.join("\n")}
              </pre>
            </section>
          ) : null}
        </div>
      ) : null}
    </ModalShell>
  );
}
