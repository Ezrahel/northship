import {
  Calendar03Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  FolderKeyIcon,
  Key02Icon,
  Time02Icon
} from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import type { ApiKeyProjectOption, ApiKeySummary } from "../../api";
import { formatTime } from "../../lib/format";
import { AppIcon, statusClass } from "../ui/primitives";

type ApiKeyListProps = {
  apiKeys: ApiKeySummary[];
  projects: ApiKeyProjectOption[];
  revokingId: string;
  onRevoke: (apiKeyId: string) => Promise<void>;
};

function isExpired(apiKey: ApiKeySummary) {
  return Boolean(apiKey.expiresAt && Date.parse(apiKey.expiresAt) <= Date.now());
}

function apiKeyStatus(apiKey: ApiKeySummary) {
  if (apiKey.revokedAt) return "revoked";
  if (isExpired(apiKey)) return "expired";
  return "active";
}

function accessLabel(apiKey: ApiKeySummary) {
  return apiKey.accessLevel === "write" ? "Read and write" : "Read";
}

function expirationLabel(apiKey: ApiKeySummary) {
  if (!apiKey.expiresAt) return "No expiration";
  return `${isExpired(apiKey) ? "Expired" : "Expires"} ${formatTime(apiKey.expiresAt)}`;
}

export function ApiKeyList({ apiKeys, projects, revokingId, onRevoke }: ApiKeyListProps) {
  const [confirmingId, setConfirmingId] = useState("");
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  function projectLabel(apiKey: ApiKeySummary) {
    if (apiKey.projectScope === "all") return "All projects";
    return apiKey.projectIds.map((projectId) => projectNames.get(projectId) ?? projectId).join(", ") || "No projects";
  }

  if (apiKeys.length === 0) {
    return (
      <section className="border border-zinc-800 bg-zinc-950/45 p-6">
        <div className="flex items-center gap-3 text-zinc-500">
          <AppIcon icon={Key02Icon} size={17} />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]">No API keys</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {apiKeys.map((apiKey) => {
        const status = apiKeyStatus(apiKey);
        const confirming = confirmingId === apiKey.id;
        const revoking = revokingId === apiKey.id;

        return (
          <div key={apiKey.id} className="border border-zinc-800 bg-zinc-950/45 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-hero text-lg tracking-tight text-zinc-100">{apiKey.name}</h3>
                  <span className={`px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass(status === "active" ? "active" : status === "expired" ? "aborted" : "failed")}`}>
                    {status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">{apiKey.tokenPrefix}</div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {confirming ? (
                  <>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center border border-rose-500/40 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-50"
                      onClick={() => void onRevoke(apiKey.id)}
                      disabled={revoking}
                      title="Revoke"
                      aria-label="Revoke API key"
                    >
                      <AppIcon icon={CheckmarkCircle02Icon} size={16} />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-zinc-500"
                      onClick={() => setConfirmingId("")}
                      disabled={revoking}
                      title="Cancel"
                      aria-label="Cancel revoke"
                    >
                      <AppIcon icon={Cancel01Icon} size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-rose-500/45 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => setConfirmingId(apiKey.id)}
                    title="Revoke"
                    aria-label="Revoke API key"
                  >
                    <AppIcon icon={Delete02Icon} size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <div className="border border-zinc-800 bg-zinc-900/45 p-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  <AppIcon icon={Key02Icon} size={13} />
                  Access
                </div>
                <div className="mt-2 truncate text-sm text-zinc-200">{accessLabel(apiKey)}</div>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/45 p-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  <AppIcon icon={FolderKeyIcon} size={13} />
                  Projects
                </div>
                <div className="mt-2 truncate text-sm text-zinc-200">{projectLabel(apiKey)}</div>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/45 p-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  <AppIcon icon={Calendar03Icon} size={13} />
                  Expiration
                </div>
                <div className="mt-2 truncate text-sm text-zinc-200">{expirationLabel(apiKey)}</div>
              </div>
              <div className="border border-zinc-800 bg-zinc-900/45 p-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  <AppIcon icon={Time02Icon} size={13} />
                  Last used
                </div>
                <div className="mt-2 truncate text-sm text-zinc-200">{formatTime(apiKey.lastUsedAt)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
