import { Key02Icon, ServerStack01Icon, UserShield01Icon } from "@hugeicons/core-free-icons";
import type { ManagedUser } from "../../api";
import { formatTime } from "../../lib/format";
import { AppIcon } from "../ui/primitives";

function roleClass(role: string) {
  if (role === "owner") return "border-[#4FB8B2]/35 bg-[#4FB8B2]/10 text-[#7fe3dd]";
  return "border-zinc-700 bg-zinc-800/80 text-zinc-300";
}

function metric(label: string, value: number, icon: unknown) {
  return (
    <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-950/45 px-3 py-2">
      <AppIcon icon={icon} size={14} className="text-zinc-500" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <span className="ml-auto font-mono text-xs font-semibold text-zinc-200">{value}</span>
    </div>
  );
}

export function UserList({ users, loading }: { users: ManagedUser[]; loading: boolean }) {
  if (loading && users.length === 0) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse border border-zinc-800 bg-zinc-900/65" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="border border-zinc-800 bg-zinc-950/55 px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
        No users yet
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {users.map((user) => (
        <article key={user.id} className="border border-zinc-800 bg-zinc-950/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="truncate text-sm font-semibold text-zinc-100">{user.name}</h4>
                <span className={`px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${roleClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
              <div className="mt-1 truncate font-mono text-xs text-zinc-500">{user.email}</div>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
              Last login {formatTime(user.lastLoginAt)}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {metric("Projects", user.projectCount, UserShield01Icon)}
            {metric("Active services", user.activeServiceCount, ServerStack01Icon)}
            {metric("API keys", user.apiKeyCount, Key02Icon)}
          </div>
        </article>
      ))}
    </div>
  );
}
