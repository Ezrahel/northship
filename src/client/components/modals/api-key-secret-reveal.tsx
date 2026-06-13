import { Cancel01Icon, CopyCheckIcon, CopyIcon, Key02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { AppIcon } from "../ui/primitives";

export function ApiKeySecretReveal({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    if (!navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="border border-emerald-500/35 bg-emerald-950/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center border border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
            <AppIcon icon={Key02Icon} size={17} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">New API key</div>
            <p className="mt-1 max-w-xl text-sm leading-6 text-emerald-100/80">
              This full key is shown only once. Store it somewhere secure before closing this dialog.
            </p>
            <div className="mt-2 flex min-w-0 items-stretch border border-emerald-500/30 bg-zinc-950/70">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2 font-mono text-xs text-emerald-100">{token}</code>
              <button
                type="button"
                className="grid w-10 shrink-0 place-items-center border-l border-emerald-500/30 text-emerald-300 transition hover:bg-emerald-500/10"
                onClick={() => void copyToken()}
                title={copied ? "Copied" : "Copy"}
                aria-label={copied ? "Copied API key" : "Copy API key"}
              >
                <AppIcon icon={copied ? CopyCheckIcon : CopyIcon} size={14} />
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center border border-emerald-500/25 text-emerald-300 transition hover:bg-emerald-500/10"
          onClick={onDismiss}
          title="Dismiss"
          aria-label="Dismiss API key"
        >
          <AppIcon icon={Cancel01Icon} size={15} />
        </button>
      </div>
    </section>
  );
}
