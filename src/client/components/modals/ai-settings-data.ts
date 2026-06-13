import anthropicLogoUrl from "../../assets/ai-providers/anthropic.svg";
import deepseekLogoUrl from "../../assets/ai-providers/deepseek.svg";
import googleLogoUrl from "../../assets/ai-providers/google.svg";
import groqLogoUrl from "../../assets/ai-providers/groq.svg";
import mistralLogoUrl from "../../assets/ai-providers/mistral.svg";
import moonshotLogoUrl from "../../assets/ai-providers/moonshot.svg";
import openaiLogoUrl from "../../assets/ai-providers/openai.svg";
import xaiLogoUrl from "../../assets/ai-providers/xai.svg";
import {
  aiProviderCatalog,
  defaultAiModel,
  type AiProviderId,
  type AiProviderModel
} from "../../../shared/ai-providers";

export type { AiProviderId, AiProviderModel };

export type AiProviderDefinition = {
  id: AiProviderId;
  name: string;
  apiKeyPlaceholder: string;
  logoUrl: string;
  logoFrameClass: string;
  models: AiProviderModel[];
};

export type AiProviderCredentials = {
  apiKey: string;
  selectedModel: string;
};

export type AiProviderConnection = {
  connected: boolean;
  keySuffix: string;
  selectedModel: string;
  savedAt: string;
};

const logoUrls: Record<AiProviderId, string> = {
  openai: openaiLogoUrl,
  anthropic: anthropicLogoUrl,
  google: googleLogoUrl,
  mistral: mistralLogoUrl,
  groq: groqLogoUrl,
  deepseek: deepseekLogoUrl,
  xai: xaiLogoUrl,
  moonshot: moonshotLogoUrl
};

const logoFrameClasses: Record<AiProviderId, string> = {
  openai: "border-emerald-400/25 bg-emerald-500/10",
  anthropic: "border-orange-400/25 bg-orange-500/10",
  google: "border-sky-400/25 bg-sky-500/10",
  mistral: "border-violet-400/25 bg-violet-500/10",
  groq: "border-amber-400/25 bg-amber-500/10",
  deepseek: "border-cyan-400/25 bg-cyan-500/10",
  xai: "border-zinc-500/30 bg-zinc-100/10",
  moonshot: "border-blue-400/25 bg-blue-500/10"
};

export const aiProviders: AiProviderDefinition[] = aiProviderCatalog.map((provider) => ({
  id: provider.id,
  name: provider.name,
  apiKeyPlaceholder: provider.apiKeyPlaceholder,
  logoUrl: logoUrls[provider.id],
  logoFrameClass: logoFrameClasses[provider.id],
  models: [...provider.models]
}));

export function createAiCredentials() {
  return aiProviders.reduce<Record<AiProviderId, AiProviderCredentials>>((credentials, provider) => {
    credentials[provider.id] = {
      apiKey: "",
      selectedModel: defaultAiModel(provider.id)
    };
    return credentials;
  }, {} as Record<AiProviderId, AiProviderCredentials>);
}

export function createAiConnections() {
  return aiProviders.reduce<Record<AiProviderId, AiProviderConnection>>((connections, provider) => {
    connections[provider.id] = {
      connected: false,
      keySuffix: "",
      selectedModel: defaultAiModel(provider.id),
      savedAt: ""
    };
    return connections;
  }, {} as Record<AiProviderId, AiProviderConnection>);
}
