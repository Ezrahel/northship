import { Add01Icon, FolderKeyIcon, Key02Icon, ShieldKeyIcon, TimeScheduleIcon } from "@hugeicons/core-free-icons";
import { FormEvent, useState } from "react";
import type { ApiKeyAccessLevel, ApiKeyExpiryDays, ApiKeyProjectOption, ApiKeyProjectScope } from "../../api";
import { Checkbox } from "../ui/checkbox";
import { AppIcon, FieldLabel, FormInput, shellButton } from "../ui/primitives";

type ApiKeyCreateInput = {
  name: string;
  accessLevel: ApiKeyAccessLevel;
  projectScope: ApiKeyProjectScope;
  projectIds: string[];
  expiresInDays: ApiKeyExpiryDays;
};

type ApiKeyCreateFormProps = {
  projects: ApiKeyProjectOption[];
  creating: boolean;
  onCreate: (input: ApiKeyCreateInput) => Promise<void>;
};

const expiryOptions: Array<{ value: ApiKeyExpiryDays; label: string }> = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: null, label: "No expiration" }
];

function optionButtonClass(active: boolean) {
  return active
    ? "flex min-h-11 items-center justify-center gap-2 border border-[#4FB8B2]/50 bg-[#4FB8B2]/14 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-normal text-[#7fe3dd]"
    : "flex min-h-11 items-center justify-center gap-2 border border-zinc-800 bg-zinc-900/70 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-normal text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100";
}

export function ApiKeyCreateForm({ projects, creating, onCreate }: ApiKeyCreateFormProps) {
  const [name, setName] = useState("");
  const [accessLevel, setAccessLevel] = useState<ApiKeyAccessLevel>("read");
  const [projectScope, setProjectScope] = useState<ApiKeyProjectScope>("all");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<ApiKeyExpiryDays>(30);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (projectScope === "selected" && projectIds.length === 0) {
      setError("Choose at least one project");
      return;
    }

    try {
      await onCreate({
        name: trimmedName,
        accessLevel,
        projectScope,
        projectIds: projectScope === "selected" ? projectIds : [],
        expiresInDays
      });
      setName("");
      setAccessLevel("read");
      setProjectScope("all");
      setProjectIds([]);
      setExpiresInDays(30);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create API key");
    }
  }

  function toggleProject(projectId: string, checked: boolean) {
    setProjectIds((current) => checked ? [...new Set([...current, projectId])] : current.filter((id) => id !== projectId));
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <FieldLabel>Name</FieldLabel>
        <FormInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Production deploys" disabled={creating} />
      </div>

      <div>
        <FieldLabel>Access</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { value: "read" as const, label: "Read", icon: ShieldKeyIcon },
            { value: "write" as const, label: "Read and write", icon: Key02Icon }
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              className={optionButtonClass(accessLevel === option.value)}
              onClick={() => setAccessLevel(option.value)}
              disabled={creating}
            >
              <AppIcon icon={option.icon} size={14} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Projects</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { value: "all" as const, label: "All projects", icon: FolderKeyIcon },
            { value: "selected" as const, label: "Specific projects", icon: FolderKeyIcon }
          ]).map((option) => (
            <button
              key={option.value}
              type="button"
              className={optionButtonClass(projectScope === option.value)}
              onClick={() => setProjectScope(option.value)}
              disabled={creating || (option.value === "selected" && projects.length === 0)}
            >
              <AppIcon icon={option.icon} size={14} />
              {option.label}
            </button>
          ))}
        </div>

        {projectScope === "selected" ? (
          <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto border border-zinc-800 bg-zinc-950/55 p-3">
            {projects.map((project) => (
              <Checkbox
                key={project.id}
                checked={projectIds.includes(project.id)}
                label={project.name}
                onChange={(checked) => toggleProject(project.id, checked)}
                disabled={creating}
                className="w-full border border-zinc-800 bg-zinc-900/45 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-zinc-200">{project.name}</span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">{project.slug}</span>
                </span>
              </Checkbox>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <FieldLabel>Expiration</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {expiryOptions.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={optionButtonClass(expiresInDays === option.value)}
              onClick={() => setExpiresInDays(option.value)}
              disabled={creating}
            >
              <AppIcon icon={TimeScheduleIcon} size={14} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={shellButton("primary")} disabled={creating}>
          <AppIcon icon={Add01Icon} size={15} />
          {creating ? "Creating..." : "Create key"}
        </button>
        {error ? <span className="font-mono text-[10px] text-rose-300">{error}</span> : null}
      </div>
    </form>
  );
}
