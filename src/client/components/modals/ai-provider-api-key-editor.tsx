import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { AiProviderDefinition } from "./ai-settings-data";

function maskedApiKey(keySuffix: string) {
  return keySuffix ? `******${keySuffix}` : "(API key unset)";
}

export function AiProviderApiKeyEditor({
  provider,
  connected,
  keySuffix,
  busy = false,
  onSaveApiKey
}: {
  provider: AiProviderDefinition;
  connected: boolean;
  keySuffix: string;
  busy?: boolean;
  onSaveApiKey: (apiKey: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!editing) return;

    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [editing]);

  async function commitApiKey() {
    if (savingRef.current) return;

    const apiKey = draft.trim();
    if (!apiKey) {
      setEditing(false);
      setDraft("");
      return;
    }

    savingRef.current = true;
    try {
      await onSaveApiKey(apiKey);
      setEditing(false);
      setDraft("");
    } finally {
      savingRef.current = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitApiKey();
    }
    if (event.key === "Escape") {
      setEditing(false);
      setDraft("");
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="password"
        name={`ai-provider-${provider.id}-api-key`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commitApiKey()}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
        placeholder={provider.apiKeyPlaceholder}
        className="mt-3 h-7 w-full border border-zinc-700 bg-zinc-900 px-2 font-mono text-[10px] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#4FB8B2]/60"
        disabled={busy}
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        data-1p-ignore="true"
        data-form-type="other"
        data-lpignore="true"
      />
    );
  }

  return (
    <button
      type="button"
      className={`mt-3 block max-w-full truncate font-mono text-[10px] outline-none transition ${
        connected ? "text-zinc-500 hover:text-zinc-200 focus:text-zinc-200" : "text-zinc-600 hover:text-zinc-300 focus:text-zinc-300"
      } disabled:cursor-wait disabled:opacity-60`}
      onClick={(event) => {
        event.stopPropagation();
        setEditing(true);
      }}
      disabled={busy}
      title={connected ? "Replace API key" : "Set API key"}
    >
      {maskedApiKey(keySuffix)}
    </button>
  );
}
