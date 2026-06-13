import type { Hono } from "hono";
import { createApiKey, createApiKeySchema, listApiKeyProjectOptions, listApiKeys, revokeApiKey } from "./api-keys.js";
import { sessionUserId } from "./api-access-control.js";

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function registerApiKeyRoutes(app: Hono) {
  app.get("/api/system/api-keys", (c) => {
    const userId = sessionUserId(c);
    if (!userId) {
      return jsonError("A browser session is required", 403);
    }

    return c.json({
      apiKeys: listApiKeys(userId),
      projects: listApiKeyProjectOptions(userId)
    });
  });

  app.post("/api/system/api-keys", async (c) => {
    const body = createApiKeySchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message ?? "Invalid API key");
    }

    const userId = sessionUserId(c);
    if (!userId) {
      return jsonError("A browser session is required", 403);
    }

    try {
      return c.json(createApiKey(body.data, userId), 201);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Could not create API key", 400);
    }
  });

  app.delete("/api/system/api-keys/:apiKeyId", (c) => {
    const userId = sessionUserId(c);
    if (!userId) {
      return jsonError("A browser session is required", 403);
    }

    const revoked = revokeApiKey(c.req.param("apiKeyId"), userId);
    if (!revoked) {
      return jsonError("API key not found", 404);
    }
    return c.json({ ok: true });
  });
}
