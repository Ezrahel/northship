import type { Context, Next } from "hono";
import type { ApiKeyAccessLevel } from "./api-keys.js";
import { getAuthContext } from "./auth.js";
import { db } from "./db.js";
import { projectGroups, type Service } from "./schema.js";
import { eq } from "drizzle-orm";

function forbidden(c: Context, error: string) {
  return c.json({ error }, 403);
}

function unauthenticated(c: Context) {
  return c.json({ error: "Authentication required" }, 401);
}

export function requireSessionAccess(c: Context) {
  const auth = getAuthContext(c);
  if (!auth) return unauthenticated(c);
  if (auth.type !== "session") {
    return forbidden(c, "This endpoint requires a browser session");
  }
  return null;
}

export async function requireSessionAccessMiddleware(c: Context, next: Next) {
  const denied = requireSessionAccess(c);
  if (denied) return denied;
  await next();
}

export function requireOwnerSessionAccess(c: Context) {
  const denied = requireSessionAccess(c);
  if (denied) return denied;

  if (!isOwnerSession(c)) {
    return forbidden(c, "Owner access is required");
  }
  return null;
}

export async function requireOwnerSessionAccessMiddleware(c: Context, next: Next) {
  const denied = requireOwnerSessionAccess(c);
  if (denied) return denied;
  await next();
}

export function accessLevelForMethod(method: string): ApiKeyAccessLevel {
  const normalized = method.toUpperCase();
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS" ? "read" : "write";
}

export function requireApiAccess(c: Context, accessLevel: ApiKeyAccessLevel) {
  const auth = getAuthContext(c);
  if (!auth) return unauthenticated(c);
  if (auth.type === "session") return null;
  if (accessLevel === "write" && auth.apiKey.accessLevel !== "write") {
    return forbidden(c, "This API key is read-only");
  }
  return null;
}

export async function requireApiMethodAccessMiddleware(c: Context, next: Next) {
  const denied = requireApiAccess(c, accessLevelForMethod(c.req.method));
  if (denied) return denied;
  await next();
}

export function canAccessProject(c: Context, projectId: string) {
  const auth = getAuthContext(c);
  if (!auth) return false;

  const project = db.select().from(projectGroups).where(eq(projectGroups.id, projectId)).get();
  if (!project) return false;

  if (auth.type === "session") {
    if (!project.ownerUserId && auth.user.role === "owner") return true;
    return project.ownerUserId === auth.user.id;
  }

  if (project.ownerUserId !== auth.apiKey.createdByUserId) return false;
  if (auth.apiKey.projectScope === "all") return true;
  return auth.apiKey.projectIdSet.has(projectId);
}

export function requireProjectAccess(c: Context, projectId: string) {
  if (canAccessProject(c, projectId)) return null;
  return forbidden(c, "This API key cannot access that project");
}

export function requireAllProjectsScope(c: Context) {
  const auth = getAuthContext(c);
  if (!auth || auth.type === "session") return null;
  if (auth.apiKey.projectScope === "all") return null;
  return forbidden(c, "This API key is scoped to selected projects");
}

export function requireServiceAccess(c: Context, service: Service) {
  return requireProjectAccess(c, service.projectId);
}

export function sessionUserId(c: Context) {
  const auth = getAuthContext(c);
  return auth?.type === "session" ? auth.user.id : null;
}

export function isOwnerSession(c: Context) {
  const auth = getAuthContext(c);
  return auth?.type === "session" && auth.user.role === "owner";
}

export function actorUserId(c: Context) {
  const auth = getAuthContext(c);
  if (!auth) return null;
  return auth.type === "session" ? auth.user.id : auth.apiKey.createdByUserId;
}
