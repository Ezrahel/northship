import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { config } from "./config.js";
import { db } from "./db.js";
import { users } from "./schema.js";
import {
  decryptAiSettings,
  decryptR2Settings,
  encryptAiSettings,
  encryptR2Settings,
  getSystemSettings,
  normalizeAiSettings,
  publicAiSettingsForAi,
  publicR2Settings,
  type AiSettings,
  type PublicAiSettings,
  type PublicR2Settings,
  type R2Settings
} from "./system-settings.js";

type StoredUserSettings = {
  ai?: AiSettings | null;
  r2?: R2Settings | null;
};

type StoredUserSettingsFile = {
  users?: Record<string, StoredUserSettings>;
};

const userSettingsPath = resolve(config.dataDir, "user-settings.json");

function hasSetting(settings: StoredUserSettings, key: keyof StoredUserSettings) {
  return Object.prototype.hasOwnProperty.call(settings, key);
}

function readUserSettingsFile(): StoredUserSettingsFile {
  try {
    if (!existsSync(userSettingsPath)) return { users: {} };
    const parsed = JSON.parse(readFileSync(userSettingsPath, "utf8")) as StoredUserSettingsFile;
    const userEntries = Object.entries(parsed.users ?? {}).map(([userId, settings]) => {
      const next: StoredUserSettings = { ...settings };
      if (hasSetting(settings, "ai")) next.ai = decryptAiSettings(settings.ai ?? null);
      if (hasSetting(settings, "r2")) next.r2 = decryptR2Settings(settings.r2 ?? null);
      return [userId, next];
    });
    return { users: Object.fromEntries(userEntries) };
  } catch (error) {
    console.error("Failed to read user settings:", error);
    return { users: {} };
  }
}

function writeUserSettingsFile(file: StoredUserSettingsFile) {
  const userEntries = Object.entries(file.users ?? {}).map(([userId, settings]) => {
    const next: StoredUserSettings = { ...settings };
    if (hasSetting(settings, "ai")) next.ai = encryptAiSettings(settings.ai ?? null);
    if (hasSetting(settings, "r2")) next.r2 = encryptR2Settings(settings.r2 ?? null);
    return [userId, next];
  });
  writeFileSync(userSettingsPath, JSON.stringify({ users: Object.fromEntries(userEntries) }, null, 2), "utf8");
}

function ownerFallbackAiSettings(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (user?.role !== "owner") return null;
  return getSystemSettings().ai ?? null;
}

function ownerFallbackR2Settings(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (user?.role !== "owner") return null;
  return getSystemSettings().r2 ?? null;
}

export function getUserAiSettings(userId: string): AiSettings | null {
  const file = readUserSettingsFile();
  const stored = file.users?.[userId];
  if (stored && Object.prototype.hasOwnProperty.call(stored, "ai")) {
    return normalizeAiSettings(stored.ai ?? null);
  }
  return normalizeAiSettings(ownerFallbackAiSettings(userId));
}

export function getUserR2Settings(userId: string): R2Settings | null {
  const file = readUserSettingsFile();
  const stored = file.users?.[userId];
  if (stored && Object.prototype.hasOwnProperty.call(stored, "r2")) {
    return stored.r2 ?? null;
  }
  return ownerFallbackR2Settings(userId);
}

export function saveUserAiSettings(userId: string, ai: AiSettings | null) {
  const file = readUserSettingsFile();
  file.users = file.users ?? {};
  file.users[userId] = {
    ...(file.users[userId] ?? {}),
    ai: normalizeAiSettings(ai)
  };
  writeUserSettingsFile(file);
}

export function saveUserR2Settings(userId: string, r2: R2Settings | null) {
  const file = readUserSettingsFile();
  file.users = file.users ?? {};
  file.users[userId] = {
    ...(file.users[userId] ?? {}),
    r2
  };
  writeUserSettingsFile(file);
}

export function publicUserAiSettings(userId: string): PublicAiSettings {
  return publicAiSettingsForAi(getUserAiSettings(userId));
}

export function publicUserR2Settings(userId: string): PublicR2Settings {
  return publicR2Settings({ ...getSystemSettings(), r2: getUserR2Settings(userId) });
}
