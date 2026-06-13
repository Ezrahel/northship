import { ArrowDown01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "../ui/primitives";
import type { AiProviderDefinition } from "./ai-settings-data";

export function AiProviderModelPicker({
  provider,
  selectedModel,
  busy = false,
  onSelectModel
}: {
  provider: AiProviderDefinition;
  selectedModel: string;
  busy?: boolean;
  onSelectModel: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => provider.models.find((model) => model.id === selectedModel) ?? provider.models[0],
    [provider.models, selectedModel]
  );

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="flex max-w-full items-center gap-1.5 font-mono text-[10px] text-zinc-500 outline-none transition hover:text-zinc-200 focus:text-zinc-200 disabled:cursor-wait disabled:opacity-60"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selected?.name ?? selectedModel}</span>
        <AppIcon icon={ArrowDown01Icon} size={12} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-3rem)] border border-zinc-700 bg-zinc-950 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]" role="listbox">
          {provider.models.map((model) => {
            const active = model.id === selectedModel;
            return (
              <button
                key={model.id}
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left transition ${
                  active ? "bg-[#4FB8B2]/15 text-[#7fe3dd]" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
                onClick={() => {
                  onSelectModel(model.id);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{model.name}</span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-zinc-500">{model.id}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {active ? <AppIcon icon={CheckmarkCircle02Icon} size={14} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
