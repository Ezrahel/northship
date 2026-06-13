import { AiBrain01Icon, ApiIcon, CloudUploadIcon, DatabaseExportIcon, GithubIcon, Globe02Icon, HardDriveIcon, Key02Icon, Queue02Icon, Refresh03Icon, Settings01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { AppIcon, SectionTitle, shellButton, surfaceClass } from "../ui/primitives";
import { ApiAccessSettingsPanel } from "./api-access-settings-panel";
import { AiSettingsPanel } from "./ai-settings-panel";
import { ControlPlaneDomainSettingsPanel } from "./control-plane-domain-settings-panel";
import { DeploymentSettingsPanel } from "./deployment-settings-panel";
import { DnsManagementPanel } from "./dns-management-panel";
import { GitHubSettingsPanel } from "./github-settings-panel";
import { MaintenanceSettingsPanel } from "./maintenance-settings-panel";
import { MigrationSettingsPanel } from "./migration-settings-panel";
import { R2StorageSettingsPanel } from "./r2-storage-settings-panel";
import { RootDomainSettingsPanel } from "./root-domain-settings-panel";
import type { SystemSettingsTab } from "./system-settings-types";
import { UpdatesSettingsPanel } from "./updates-settings-panel";
import { UsersSettingsPanel } from "./users-settings-panel";

const ownerSettingsTabs: Array<{ id: SystemSettingsTab; label: string; icon: unknown }> = [
  { id: "root-domain", label: "Domains", icon: Globe02Icon },
  { id: "dns", label: "DNS", icon: ApiIcon },
  { id: "github", label: "GitHub", icon: GithubIcon },
  { id: "ai", label: "AI", icon: AiBrain01Icon },
  { id: "api-access", label: "API Access", icon: Key02Icon },
  { id: "users", label: "Users", icon: UserGroupIcon },
  { id: "storage", label: "Storage", icon: CloudUploadIcon },
  { id: "migration", label: "Migration", icon: DatabaseExportIcon },
  { id: "maintenance", label: "Maintenance", icon: HardDriveIcon },
  { id: "deployments", label: "Deployments", icon: Queue02Icon },
  { id: "updates", label: "Updates", icon: Refresh03Icon }
];

const userSettingsTabs = ownerSettingsTabs.filter((tab) => tab.id === "ai" || tab.id === "api-access" || tab.id === "storage");

export function SystemSettingsModal({
  activeTab,
  onTabChange,
  open,
  onClose
}: {
  activeTab: SystemSettingsTab;
  onTabChange: (tab: SystemSettingsTab) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [role, setRole] = useState<"loading" | "owner" | "user">("loading");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRole("loading");
    void api.authStatus().then((status) => {
      if (!cancelled) setRole(status.user?.role === "owner" ? "owner" : "user");
    }).catch(() => {
      if (!cancelled) setRole("user");
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const roleLoaded = role !== "loading";
  const owner = role === "owner";
  const settingsTabs = roleLoaded ? owner ? ownerSettingsTabs : userSettingsTabs : [];
  const visibleTab = roleLoaded && settingsTabs.some((tab) => tab.id === activeTab) ? activeTab : settingsTabs[0]?.id ?? "ai";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-[94%] items-center justify-center lg:max-w-7xl">
        <div className={surfaceClass("flex h-[min(900px,calc(100vh-2rem))] min-h-[640px] w-full flex-col p-6 md:p-8")}>
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-zinc-800/90 pb-5">
            <SectionTitle
              icon={Settings01Icon}
              title={owner ? "System Settings" : "Settings"}
              meta={owner ? "Configure global infrastructure, users, routing, and updates." : "Manage account-level access, AI providers, and backup storage."}
            />
            <button type="button" className={shellButton("ghost")} onClick={onClose}>
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid h-full gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="space-y-1 border-r border-zinc-800/80 pr-6">
                <div className="space-y-1">
                  {!roleLoaded ? (
                    <div className="border border-zinc-800 bg-zinc-900/55 px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Loading
                    </div>
                  ) : null}
                  {settingsTabs.map((tab) => {
                    const active = visibleTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={
                          active
                            ? "flex w-full items-center gap-2.5 border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-left font-mono text-xs font-semibold uppercase tracking-wider text-[#4FB8B2]"
                            : "flex w-full items-center gap-2.5 border border-transparent px-3 py-2.5 text-left font-mono text-xs font-semibold uppercase tracking-wider text-zinc-500 transition hover:border-zinc-800 hover:bg-zinc-900/55 hover:text-zinc-200"
                        }
                        onClick={() => onTabChange(tab.id)}
                      >
                        <AppIcon icon={tab.icon} size={15} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {owner ? (
                  <div className="mt-5 border-t border-zinc-800 pt-5">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 border border-[#4FB8B2]/30 bg-[#4FB8B2]/10 px-3 py-2.5 text-left font-mono text-xs font-semibold uppercase leading-none tracking-normal text-[#7fe3dd] transition hover:bg-[#4FB8B2]/16"
                      onClick={() => window.location.assign("/onboarding")}
                    >
                      <AppIcon icon={Refresh03Icon} size={15} className="shrink-0" />
                      <span className="min-w-0 truncate">Restart onboarding</span>
                    </button>
                  </div>
                ) : null}
              </aside>

              <div>
                {!roleLoaded ? (
                  <div className="border border-zinc-800 bg-zinc-950/55 px-4 py-8 font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">Loading settings</div>
                ) : null}
                {roleLoaded && visibleTab === "root-domain" ? (
                  <div className="space-y-5">
                    <ControlPlaneDomainSettingsPanel open={open} />
                    <RootDomainSettingsPanel open={open} />
                  </div>
                ) : null}
                {roleLoaded && visibleTab === "dns" ? <DnsManagementPanel /> : null}
                {roleLoaded && visibleTab === "github" ? <GitHubSettingsPanel open={open} /> : null}
                {roleLoaded && visibleTab === "ai" ? <AiSettingsPanel /> : null}
                {roleLoaded && visibleTab === "api-access" ? <ApiAccessSettingsPanel open={open} /> : null}
                {roleLoaded && visibleTab === "users" ? <UsersSettingsPanel open={open} /> : null}
                {roleLoaded && visibleTab === "storage" ? <R2StorageSettingsPanel open={open} mode={owner ? "system" : "account"} /> : null}
                {roleLoaded && visibleTab === "migration" ? <MigrationSettingsPanel /> : null}
                {roleLoaded && visibleTab === "maintenance" ? <MaintenanceSettingsPanel open={open} /> : null}
                {roleLoaded && visibleTab === "deployments" ? <DeploymentSettingsPanel open={open} /> : null}
                {roleLoaded && visibleTab === "updates" ? <UpdatesSettingsPanel open={open} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
