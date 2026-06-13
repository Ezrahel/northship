import { ArrowDown01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiProviderStatus } from "../../api";
import type { AiProviderId } from "../../../shared/ai-providers";
import { aiProviders } from "../../components/modals/ai-settings-data";
import { AppIcon } from "../../components/ui/primitives";

function providerLogo(providerId: AiProviderId) {
  return aiProviders.find((provider) => provider.id === providerId);
}

function selectedModelName(provider: AiProviderStatus | null, selectedModel: string) {
  return provider?.models.find((model) => model.id === selectedModel)?.name ?? (selectedModel || "Select model");
}

export function DeploymentFailureModelPicker({
  providers,
  selectedProviderId,
  selectedModel,
  disabled = false,
  onSelect
}: {
  providers: AiProviderStatus[];
  selectedProviderId: AiProviderId | "";
  selectedModel: string;
  disabled?: boolean;
  onSelect: (providerId: AiProviderId, modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<AiProviderId | "">(selectedProviderId);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;
  const activeProvider = providers.find((provider) => provider.id === activeProviderId) ?? selectedProvider ?? providers[0] ?? null;
  const selectedProviderLogo = selectedProvider ? providerLogo(selectedProvider.id) : null;
  const currentModelName = selectedModelName(selectedProvider, selectedModel);

  const providerLogos = useMemo(
    () => providers.map((provider) => ({ provider, logo: providerLogo(provider.id) })),
    [providers]
  );

  useEffect(() => {
    if (!open) return;
    setActiveProviderId((current) => current || selectedProviderId || providers[0]?.id || "");
  }, [open, providers, selectedProviderId]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-9 max-w-full items-center gap-2 bg-zinc-900/45 px-2.5 text-left text-xs text-zinc-100 outline-none transition hover:bg-zinc-900 disabled:cursor-wait disabled:opacity-60"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        disabled={disabled || providers.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedProviderLogo ? <img src={selectedProviderLogo.logoUrl} alt="" className="h-4 w-4 shrink-0 object-contain" /> : null}
        <span className="min-w-0 truncate">{currentModelName}</span>
        <AppIcon icon={ArrowDown01Icon} size={13} className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 flex w-[560px] max-w-[calc(100vw-4rem)] overflow-hidden border border-zinc-700 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          <div className="flex w-16 shrink-0 flex-col items-center border-r border-zinc-800 bg-zinc-950/95 py-2">
            {providerLogos.map(({ provider, logo }) => {
              const active = provider.id === activeProvider?.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  className={`grid h-12 w-full place-items-center border-l-2 transition ${
                    active ? "border-[#4FB8B2] bg-[#4FB8B2]/10" : "border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                  onClick={() => setActiveProviderId(provider.id)}
                  title={provider.name}
                  aria-label={provider.name}
                >
                  {logo ? <img src={logo.logoUrl} alt="" className="max-h-6 max-w-7 object-contain" /> : <span className="text-xs">{provider.name.slice(0, 2)}</span>}
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{activeProvider?.name ?? "Provider"}</div>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {(activeProvider?.models ?? []).map((model) => {
                const active = activeProvider?.id === selectedProviderId && model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition ${
                      active ? "bg-[#4FB8B2]/15 text-[#7fe3dd]" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    }`}
                    onClick={() => {
                      if (activeProvider) onSelect(activeProvider.id, model.id);
                      setOpen(false);
                    }}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{model.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">{model.id}</span>
                    </span>
                    {active ? <AppIcon icon={CheckmarkCircle02Icon} size={15} className="shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
