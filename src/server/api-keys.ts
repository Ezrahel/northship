import type { Context } from "hono";
import { and, asc, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, nowIso } from "./db.js";
import { apiKeyProjectScopes, apiKeys, projectGroups, type ApiKey } from "./schema.js";

export const apiKeyAccessLevelSchema = z.enum(["read", "write"]);
export const apiKeyProjectScopeSchema = z.enum(["all", "selected"]);
export const apiKeyExpiryDaysSchema = z.union([z.literal(7), z.literal(30), z.literal(90), z.null()]);

export const createApiKeySchema = z
  .object({
    name: z.string().trim().min(1, "API key name is required").max(80, "API key name must be 80 characters or fewer"),
    accessLevel: apiKeyAccessLevelSchema,
    projectScope: apiKeyProjectScopeSchema,
    projectIds: z.array(z.string().trim().min(1)).default([]),
    expiresInDays: apiKeyExpiryDaysSchema
  })
  .superRefine((value, context) => {
    if (value.projectScope === "selected" && value.projectIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Choose at least one project for a selected-project key",
        path: ["projectIds"]
      });
    }
  });

export type ApiKeyAccessLevel = z.infer<typeof apiKeyAccessLevelSchema>;
export type ApiKeyProjectScope = z.infer<typeof apiKeyProjectScopeSchema>;
export type ApiKeyExpiryDays = z.infer<typeof apiKeyExpiryDaysSchema>;

export type PublicApiKey = {
  id: string;
  name: string;
  tokenPrefix: string;
  accessLevel: ApiKeyAccessLevel;
  projectScope: ApiKeyProjectScope;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: null | string;
  expiresAt: null | string;
  revokedAt: null | string;
};

export type ApiKeyProjectOption = {
  id: string;
  name: string;
  slug: string;
};

export type AuthenticatedApiKey = PublicApiKey & {
  createdByUserId: string;
  projectIdSet: Set<string>;
};

function hashApiKeyToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function apiKeyExpiresAt(expiresInDays: ApiKeyExpiryDays) {
  if (expiresInDays === null) return null;
  return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
}

function generateApiKeyToken() {
  const visibleId = randomBytes(6).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const tokenPrefix = `ap_${visibleId}`;
  return {
    token: `${tokenPrefix}_${secret}`,
    tokenPrefix
  };
}

function projectIdsForApiKey(apiKeyId: string) {
  return db
    .select({ projectId: apiKeyProjectScopes.projectId })
    .from(apiKeyProjectScopes)
    .where(eq(apiKeyProjectScopes.apiKeyId, apiKeyId))
    .all()
    .map((row) => row.projectId);
}

function publicApiKey(apiKey: ApiKey, projectIds = projectIdsForApiKey(apiKey.id)): PublicApiKey {
  return {
    id: apiKey.id,
    name: apiKey.name,
    tokenPrefix: apiKey.tokenPrefix,
    accessLevel: apiKey.accessLevel as ApiKeyAccessLevel,
    projectScope: apiKey.projectScope as ApiKeyProjectScope,
    projectIds,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    revokedAt: apiKey.revokedAt
  };
}

function ensureSelectedProjectsExist(projectIds: string[], ownerUserId: string) {
  const uniqueProjectIds = [...new Set(projectIds)];
  if (uniqueProjectIds.length === 0) return uniqueProjectIds;

  const existingProjectIds = new Set(
    db
      .select({ id: projectGroups.id })
      .from(projectGroups)
      .where(eq(projectGroups.ownerUserId, ownerUserId))
      .all()
      .map((project) => project.id)
  );
  const missingProjectId = uniqueProjectIds.find((projectId) => !existingProjectIds.has(projectId));
  if (missingProjectId) {
    throw new Error("One or more selected projects no longer exist");
  }
  return uniqueProjectIds;
}

export function apiKeyTokenFromRequest(c: Context) {
  const authorization = c.req.header("authorization")?.trim();
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (match?.[1]) return match[1].trim();
  }

  const headerToken = c.req.header("x-api-key")?.trim();
  return headerToken || null;
}

export function authenticateApiKeyToken(token: string): AuthenticatedApiKey | null {
  const tokenHash = hashApiKeyToken(token);
  const apiKey = db.select().from(apiKeys).where(eq(apiKeys.tokenHash, tokenHash)).get();
  if (!apiKey || apiKey.revokedAt) return null;

  if (apiKey.expiresAt && Date.parse(apiKey.expiresAt) <= Date.now()) {
    return null;
  }

  const projectIds = projectIdsForApiKey(apiKey.id);
  const timestamp = nowIso();
  db.update(apiKeys).set({ lastUsedAt: timestamp, updatedAt: timestamp }).where(eq(apiKeys.id, apiKey.id)).run();

  return {
    ...publicApiKey({ ...apiKey, lastUsedAt: timestamp, updatedAt: timestamp }, projectIds),
    createdByUserId: apiKey.createdByUserId,
    projectIdSet: new Set(projectIds)
  };
}

export function listApiKeys(createdByUserId: string) {
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.createdByUserId, createdByUserId), isNull(apiKeys.revokedAt)))
    .orderBy(asc(apiKeys.name))
    .all()
    .map((apiKey) => publicApiKey(apiKey));
}

export function listApiKeyProjectOptions(ownerUserId: string): ApiKeyProjectOption[] {
  return db
    .select({ id: projectGroups.id, name: projectGroups.name, slug: projectGroups.slug })
    .from(projectGroups)
    .where(eq(projectGroups.ownerUserId, ownerUserId))
    .orderBy(asc(projectGroups.name))
    .all();
}

export function createApiKey(input: z.infer<typeof createApiKeySchema>, createdByUserId: string) {
  const selectedProjectIds = input.projectScope === "selected" ? ensureSelectedProjectsExist(input.projectIds, createdByUserId) : [];
  const timestamp = nowIso();
  const { token, tokenPrefix } = generateApiKeyToken();
  const apiKey: ApiKey = {
    id: nanoid(12),
    name: input.name,
    tokenHash: hashApiKeyToken(token),
    tokenPrefix,
    accessLevel: input.accessLevel,
    projectScope: input.projectScope,
    createdByUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: null,
    expiresAt: apiKeyExpiresAt(input.expiresInDays),
    revokedAt: null
  };

  db.insert(apiKeys).values(apiKey).run();
  for (const projectId of selectedProjectIds) {
    db.insert(apiKeyProjectScopes)
      .values({
        id: nanoid(12),
        apiKeyId: apiKey.id,
        projectId,
        createdAt: timestamp
      })
      .run();
  }

  return {
    apiKey: publicApiKey(apiKey, selectedProjectIds),
    token
  };
}

export function revokeApiKey(apiKeyId: string, createdByUserId: string) {
  const apiKey = db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.createdByUserId, createdByUserId)))
    .get();
  if (!apiKey || apiKey.revokedAt) return false;

  const timestamp = nowIso();
  db.update(apiKeys).set({ revokedAt: timestamp, updatedAt: timestamp }).where(eq(apiKeys.id, apiKey.id)).run();
  return true;
}
