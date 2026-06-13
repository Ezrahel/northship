export const systemSettingsTabValues = ["root-domain", "dns", "github", "ai", "api-access", "users", "storage", "migration", "maintenance", "deployments", "updates"] as const;

export type SystemSettingsTab = (typeof systemSettingsTabValues)[number];

export function isSystemSettingsTab(value: unknown): value is SystemSettingsTab {
  return typeof value === "string" && systemSettingsTabValues.includes(value as SystemSettingsTab);
}
