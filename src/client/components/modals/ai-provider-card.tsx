import { StarIcon } from "@hugeicons/core-free-icons";
import { AppIcon } from "../ui/primitives";
import { AiProviderApiKeyEditor } from "./ai-provider-api-key-editor";
import type { AiProviderDefinition } from "./ai-settings-data";
import { AiProviderModelPicker } from "./ai-provider-model-picker";

export function AiProviderCard({
  provider,
  selected,
  model,
  connected,
  keySuffix,
  isDefaultModel = false,
  updating = false,
  onSelect,
  onSelectModel,
  onSaveApiKey,
  onSetDefaultModel
}: {
  provider: AiProviderDefinition;
  selected: boolean;
  model: string;
  connected: boolean;
  keySuffix: string;
  isDefaultModel?: boolean;
  updating?: boolean;
  onSelect: () => void;
  onSelectModel: (modelId: string) => void;
  onSaveApiKey: (apiKey: string) => Promise<void> | void;
  onSetDefaultModel: () => void;
}) {
  return (
    <div
      className="flex min-h-28 items-start justify-between gap-3 border border-zinc-800 bg-zinc-950/35 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-900/65"
      onClick={onSelect}
      aria-selected={selected}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center border ${provider.logoFrameClass}`}>
          <img src={provider.logoUrl} alt="" className="max-h-6 max-w-7 object-contain" loading="lazy" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-100">{provider.name}</span>
          <AiProviderModelPicker provider={provider} selectedModel={model} busy={updating} onSelectModel={onSelectModel} />
          <AiProviderApiKeyEditor provider={provider} connected={connected} keySuffix={keySuffix} busy={updating} onSaveApiKey={onSaveApiKey} />
        </span>
      </span>
      <button
        type="button"
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border transition disabled:cursor-wait disabled:opacity-60 ${
          isDefaultModel ? "border-amber-400/60 bg-amber-400/15 text-amber-300" : "border-zinc-700 bg-zinc-900/70 text-zinc-500"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onSetDefaultModel();
        }}
        disabled={updating}
        title={isDefaultModel ? "Default model" : "Set as default model"}
        aria-label={isDefaultModel ? "Default model" : "Set as default model"}
      >
        <AppIcon icon={StarIcon} size={14} className={isDefaultModel ? "fill-amber-300" : ""} />
      </button>
    </div>
  );
}
