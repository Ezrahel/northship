import { CopyCheckIcon, CopyIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { AppIcon } from "../../components/ui/primitives";

function copyTextFallback(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function DeploymentFailureCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(command);
    } else {
      copyTextFallback(command);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto border border-zinc-800 bg-zinc-900/70 px-3 py-2 font-mono text-xs text-zinc-200">
        {command}
      </pre>
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-[#4FB8B2]/45 hover:bg-[#4FB8B2]/10 hover:text-[#7fe3dd]"
        onClick={() => void copyCommand()}
        title={copied ? "Copied" : "Copy command"}
        aria-label={copied ? "Copied command" : "Copy command"}
      >
        <AppIcon icon={copied ? CopyCheckIcon : CopyIcon} size={15} />
      </button>
    </div>
  );
}
