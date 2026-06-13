import { Add01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { api, type ManagedUser } from "../../api";
import { AppIcon, shellButton } from "../ui/primitives";
import { ModalShell } from "./modal-shell";
import { UserCreateForm } from "./user-create-form";
import { UserList } from "./user-list";

function sortUsers(users: ManagedUser[]) {
  const list = Array.isArray(users) ? users : [];
  return [...list].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (b.role === "owner" && a.role !== "owner") return 1;
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
  });
}

export function UsersSettingsPanel({ open }: { open: boolean }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const result = await api.systemUsers();
      setUsers(sortUsers(result.users));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadUsers();
  }, [open]);

  async function createUser(input: { email: string; password: string }) {
    setCreating(true);
    setError("");
    try {
      const result = await api.createSystemUser(input);
      setUsers((current) => sortUsers([...current, result.user]));
      setCreateOpen(false);
    } catch (issue) {
      throw new Error(issue instanceof Error ? issue.message : "Could not create user");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-hero text-xl tracking-tight text-zinc-100">Users</h3>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {loading ? "Loading..." : `${users.length} user${users.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <button type="button" className={shellButton("primary")} onClick={() => setCreateOpen(true)} disabled={loading}>
          <AppIcon icon={Add01Icon} size={15} />
          Add user
        </button>
      </div>

      <UserList users={users} loading={loading} />

      {error ? <div className="border border-rose-500/35 bg-rose-950/30 px-3.5 py-2.5 font-mono text-[10px] text-rose-300">{error}</div> : null}

      <ModalShell
        open={createOpen}
        title="Add user"
        meta="Email and password"
        icon={UserGroupIcon}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        width="max-w-xl"
        minHeight=""
        bodyClassName="min-h-0"
      >
        <UserCreateForm creating={creating} onCreate={createUser} />
      </ModalShell>
    </div>
  );
}
