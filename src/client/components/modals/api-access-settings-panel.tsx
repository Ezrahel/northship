import { Add01Icon, Key02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { api, type ApiKeyExpiryDays, type ApiKeyProjectOption, type ApiKeySummary } from "../../api";
import { AppIcon, shellButton } from "../ui/primitives";
import { ApiKeyCreateForm } from "./api-key-create-form";
import { ApiKeyList } from "./api-key-list";
import { ApiKeySecretReveal } from "./api-key-secret-reveal";
import { ModalShell } from "./modal-shell";

type CreateApiKeyInput = {
  name: string;
  accessLevel: "read" | "write";
  projectScope: "all" | "selected";
  projectIds: string[];
  expiresInDays: ApiKeyExpiryDays;
};

function sortApiKeys(apiKeys: ApiKeySummary[]) {
  return [...apiKeys].sort((a, b) => a.name.localeCompare(b.name));
}

export function ApiAccessSettingsPanel({ open }: { open: boolean }) {
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [projects, setProjects] = useState<ApiKeyProjectOption[]>([]);
  const [createdToken, setCreatedToken] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState("");
  const [error, setError] = useState("");

  async function loadApiKeys() {
    setLoading(true);
    setError("");
    try {
      const result = await api.apiKeys();
      setApiKeys(sortApiKeys(result.apiKeys));
      setProjects(result.projects);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load API keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadApiKeys();
  }, [open]);

  async function createKey(input: CreateApiKeyInput) {
    setCreating(true);
    setError("");
    setCreatedToken("");
    try {
      const result = await api.createApiKey(input);
      setCreatedToken(result.token);
      setApiKeys((current) => sortApiKeys([...current, result.apiKey]));
      setCreateOpen(false);
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not create API key";
      throw new Error(message);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(apiKeyId: string) {
    setRevokingId(apiKeyId);
    setError("");
    try {
      await api.revokeApiKey(apiKeyId);
      setApiKeys((current) => current.filter((apiKey) => apiKey.id !== apiKeyId));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not revoke API key");
    } finally {
      setRevokingId("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-hero text-xl tracking-tight text-zinc-100">API keys</h3>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {loading ? "Loading..." : `${apiKeys.length} keys`}
          </div>
        </div>
        <button type="button" className={shellButton("primary")} onClick={() => setCreateOpen(true)} disabled={loading}>
          <AppIcon icon={Add01Icon} size={15} />
          Create API key
        </button>
      </div>

      <ApiKeyList apiKeys={apiKeys} projects={projects} revokingId={revokingId} onRevoke={revokeKey} />

      {error ? <div className="border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5 font-mono text-[10px] text-rose-300">{error}</div> : null}

      <ModalShell
        open={createOpen}
        title="Create API key"
        meta="Bearer token access"
        icon={Key02Icon}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        width="max-w-2xl"
      >
        <ApiKeyCreateForm projects={projects} creating={creating || loading} onCreate={createKey} />
      </ModalShell>

      <ModalShell
        open={Boolean(createdToken)}
        title="New API key"
        meta="Shown only once"
        icon={Key02Icon}
        onClose={() => setCreatedToken("")}
        width="max-w-2xl"
        minHeight=""
        bodyClassName="min-h-0"
      >
        <ApiKeySecretReveal token={createdToken} onDismiss={() => setCreatedToken("")} />
      </ModalShell>
    </div>
  );
}
