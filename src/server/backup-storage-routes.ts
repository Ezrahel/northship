import type { Hono } from "hono";
import { z } from "zod";
import { sessionUserId } from "./api-access-control.js";
import { nowIso } from "./db.js";
import { ensureR2Bucket } from "./r2-storage.js";
import { hasSecretKey } from "./secret-crypto.js";
import { getUserR2Settings, publicUserR2Settings, saveUserR2Settings } from "./user-settings.js";

const r2ConnectionSchema = z.object({
  accountId: z.string().trim().min(1).transform((value) => value.toLowerCase()),
  bucket: z.string().trim().min(1).regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i, "Use a valid R2 bucket name").transform((value) => value.toLowerCase()),
  accessKeyId: z.string().trim().min(1),
  secretAccessKey: z.string().min(1).optional(),
  createBucket: z.boolean().optional().default(true)
});

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function registerBackupStorageRoutes(app: Hono) {
  app.get("/api/system/backup-storage/r2", (c) => {
    const userId = sessionUserId(c);
    if (!userId) return jsonError("A browser session is required", 403);
    return c.json({ r2: publicUserR2Settings(userId) });
  });

  app.post("/api/system/backup-storage/r2", async (c) => {
    const userId = sessionUserId(c);
    if (!userId) return jsonError("A browser session is required", 403);
    if (!hasSecretKey()) {
      return jsonError("NORTHSHIP_SECRET_KEY is required before saving R2 credentials", 409);
    }

    const body = r2ConnectionSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message ?? "Invalid R2 settings");
    }

    const existing = getUserR2Settings(userId);
    const timestamp = nowIso();
    const secretAccessKey = body.data.secretAccessKey || existing?.secretAccessKey;
    const accessKeyId = body.data.accessKeyId.startsWith("******") ? existing?.accessKeyId : body.data.accessKeyId;
    if (!secretAccessKey) return jsonError("Secret access key is required");
    if (!accessKeyId) return jsonError("Access key ID is required");

    const r2 = {
      accountId: body.data.accountId,
      bucket: body.data.bucket,
      accessKeyId,
      secretAccessKey,
      endpoint: `https://${body.data.accountId}.r2.cloudflarestorage.com`,
      connectedAt: existing?.connectedAt ?? timestamp,
      updatedAt: timestamp
    };

    if (body.data.createBucket) {
      try {
        await ensureR2Bucket(r2);
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Could not create or verify R2 bucket", 400);
      }
    }

    saveUserR2Settings(userId, r2);
    return c.json({ ok: true, r2: publicUserR2Settings(userId) });
  });

  app.delete("/api/system/backup-storage/r2", (c) => {
    const userId = sessionUserId(c);
    if (!userId) return jsonError("A browser session is required", 403);
    saveUserR2Settings(userId, null);
    return c.json({ ok: true, r2: publicUserR2Settings(userId) });
  });
}
