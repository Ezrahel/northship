import { AiBrain01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { api, type AiSettingsStatus } from "../../api";
import { SectionTitle } from "../ui/primitives";
import { AiProviderCard } from "./ai-provider-card";
import {
  aiProviders,
  createAiConnections,
  type AiProviderId
} from "./ai-settings-data";

export function AiSettingsPanel() {
  const [selectedProviderId, setSelectedProviderId] = useState<AiProviderId>("openai");
  const [defaultProviderId, setDefaultProviderId] = useState<AiProviderId | null>(null);
  const [defaultModel, setDefaultModel] = useState("");
  const [connections, setConnections] = useState(createAiConnections);
  const [credentialError, setCredentialError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyProviderId, setBusyProviderId] = useState<AiProviderId | null>(null);

  const defaultProvider = defaultProviderId ? aiProviders.find((provider) => provider.id === defaultProviderId) : null;

  function syncAiSettings(ai: AiSettingsStatus) {
    const nextConnections = createAiConnections();

    for (const provider of aiProviders) {
      const status = ai.providers.find((item) => item.id === provider.id);
      if (!status) continue;

      nextConnections[provider.id] = {
        connected: status.connected,
        keySuffix: status.keySuffix,
        selectedModel: status.selectedModel,
        savedAt: status.updatedAt ?? status.connectedAt ?? ""
      };
    }

    setDefaultProviderId(ai.defaultProvider);
    setDefaultModel(ai.defaultModel);
    setConnections(nextConnections);
  }

  useEffect(() => {
    let ignore = false;

    async function loadAiSettings() {
      setLoading(true);
      try {
        const response = await api.aiSettings();
        if (!ignore) {
          syncAiSettings(response.ai);
          setCredentialError("");
        }
      } catch (error) {
        if (!ignore) setCredentialError(error instanceof Error ? error.message : "Could not load AI providers.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadAiSettings();
    return () => {
      ignore = true;
    };
  }, []);

  function selectProvider(providerId: AiProviderId) {
    setSelectedProviderId(providerId);
    setCredentialError("");
  }

  function updateProviderModelDraft(providerId: AiProviderId, modelId: string) {
    setConnections((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        selectedModel: modelId
      }
    }));
    if (defaultProviderId === providerId) setDefaultModel(modelId);
  }

  async function updateProviderModel(providerId: AiProviderId, modelId: string) {
    if (connections[providerId].selectedModel === modelId) return;

    const provider = aiProviders.find((item) => item.id === providerId);
    const previousConnection = connections[providerId];
    const previousDefaultModel = defaultModel;
    updateProviderModelDraft(providerId, modelId);

    if (!previousConnection.connected) {
      setSelectedProviderId(providerId);
      setCredentialError("");
      return;
    }

    setBusyProviderId(providerId);
    try {
      const response = await api.updateAiProvider(providerId, { apiKey: "", selectedModel: modelId });
      syncAiSettings(response.ai);
      setCredentialError("");
    } catch (error) {
      setConnections((current) => ({ ...current, [providerId]: previousConnection }));
      setDefaultModel(previousDefaultModel);
      setCredentialError(error instanceof Error ? error.message : `Could not update ${provider?.name ?? providerId} model.`);
    } finally {
      setBusyProviderId(null);
    }
  }

  async function updateProviderApiKey(providerId: AiProviderId, apiKey: string) {
    const provider = aiProviders.find((item) => item.id === providerId);
    const selectedModel = connections[providerId].selectedModel;

    setBusyProviderId(providerId);
    try {
      const response = await api.updateAiProvider(providerId, { apiKey, selectedModel });
      syncAiSettings(response.ai);
      setCredentialError("");
    } catch (error) {
      setCredentialError(error instanceof Error ? error.message : `Could not save ${provider?.name ?? providerId} API key.`);
      throw error;
    } finally {
      setBusyProviderId(null);
    }
  }

  async function updateDefaultModel(providerId: AiProviderId) {
    const connection = connections[providerId];
    const provider = aiProviders.find((item) => item.id === providerId);
    const modelId = connection.selectedModel;
    if (defaultProviderId === providerId && defaultModel === modelId) return;

    if (!connection.connected) {
      setSelectedProviderId(providerId);
      setCredentialError(`Save a ${provider?.name ?? providerId} API key before setting it as default.`);
      return;
    }

    const previousDefaultProvider = defaultProviderId;
    const previousDefaultModel = defaultModel;
    setDefaultProviderId(providerId);
    setDefaultModel(modelId);
    setBusyProviderId(providerId);

    try {
      const response = await api.updateAiSettings({ defaultProvider: providerId, defaultModel: modelId });
      syncAiSettings(response.ai);
      setCredentialError("");
    } catch (error) {
      setDefaultProviderId(previousDefaultProvider);
      setDefaultModel(previousDefaultModel);
      setCredentialError(error instanceof Error ? error.message : `Could not set ${provider?.name ?? providerId} as default.`);
    } finally {
      setBusyProviderId(null);
    }
  }

  return (
    <section className="space-y-5 border border-zinc-800 bg-zinc-950/30 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionTitle icon={AiBrain01Icon} title="AI" />
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          <span className="text-zinc-600">Default</span>
          <span className="text-zinc-200">{defaultProvider ? `${defaultProvider.name} / ${defaultModel}` : "None"}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {aiProviders.map((provider) => (
          <AiProviderCard
            key={provider.id}
            provider={provider}
            selected={provider.id === selectedProviderId}
            model={connections[provider.id].selectedModel}
            connected={connections[provider.id].connected}
            keySuffix={connections[provider.id].keySuffix}
            isDefaultModel={provider.id === defaultProviderId && connections[provider.id].selectedModel === defaultModel}
            updating={busyProviderId === provider.id}
            onSelect={() => selectProvider(provider.id)}
            onSelectModel={(modelId) => void updateProviderModel(provider.id, modelId)}
            onSaveApiKey={(apiKey) => updateProviderApiKey(provider.id, apiKey)}
            onSetDefaultModel={() => void updateDefaultModel(provider.id)}
          />
        ))}
      </div>

      {loading ? <div className="border border-zinc-800 bg-zinc-900/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Loading AI providers...</div> : null}
      {credentialError ? <div className="border border-rose-500/35 bg-rose-950/25 px-3 py-2 font-mono text-[10px] text-rose-200">{credentialError}</div> : null}
    </section>
  );
}
