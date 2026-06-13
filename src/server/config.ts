import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(filePath: string, { override = false } = {}) {
  if (!existsSync(filePath)) return;

  const source = readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = rawLine.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = rawLine.slice(0, separatorIndex).trim();
    if (!key || (!override && process.env[key] !== undefined)) continue;

    let value = rawLine.slice(separatorIndex + 1).trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0];
      value = value.slice(1);

      while (!value.endsWith(quote) && index < lines.length - 1) {
        index += 1;
        value += `\n${lines[index] ?? ""}`;
      }

      if (value.endsWith(quote)) {
        value = value.slice(0, -1);
      }
    }

    process.env[key] = value;
  }
}

applyEnvFile(resolve(process.cwd(), ".env"));
applyEnvFile(resolve(process.cwd(), ".env.local"), { override: true });
if (process.env.NORTHSHIP_ENV_PATH) {
  applyEnvFile(resolve(process.env.NORTHSHIP_ENV_PATH), { override: true });
}

const northshipRepoUrl = "https://github.com/ezrahel/northship.git";
const legacyNorthshipRepoUrls = new Set([
  "https://github.com/ezrahel/northship",
  "https://github.com/ezrahel/northship.git",
  "git@github.com:ezrahel/northship",
  "git@github.com:ezrahel/northship.git"
]);

function normalizeNorthshipRepoUrl(repoUrl: string) {
  return legacyNorthshipRepoUrls.has(repoUrl.trim()) ? northshipRepoUrl : repoUrl;
}

function normalizeNorthshipImage(image: string) {
  return image.trim().replace(/^ghcr\.io\/akinloluwami\/northship(?=[:@]|$)/, "ghcr.io/ezrahel/northship");
}

const defaultNorthshipImage = normalizeNorthshipImage(process.env.NORTHSHIP_IMAGE ?? "ghcr.io/ezrahel/northship:latest");
const northshipInstallDir = process.env.NORTHSHIP_INSTALL_DIR ?? "/opt/northship";
const defaultImageUpdateCmd = `docker rm -f northship-self-updater >/dev/null 2>&1 || true; docker run -d --name northship-self-updater -v /var/run/docker.sock:/var/run/docker.sock -v ${northshipInstallDir}:${northshipInstallDir} -w ${northshipInstallDir} ${defaultNorthshipImage} sh -lc 'docker compose pull northship && docker compose up -d --no-deps northship'`;
const dataDir = resolve(process.env.DATA_DIR ?? "data");
const caddyDataDir = process.env.CADDY_DATA_DIR ?? (process.env.CADDY_RELOAD_CMD === "true" ? "/data" : dataDir);

export const config = {
  port: Number(process.env.PORT ?? 4310),
  host: process.env.HOST ?? "0.0.0.0",
  publicUrl: process.env.PUBLIC_URL ?? "http://localhost:5173",
  controlPlaneHostname: process.env.CONTROL_PLANE_HOSTNAME?.trim().toLowerCase() ?? "",
  dataDir,
  deployDryRun: process.env.DEPLOY_DRY_RUN === "true",
  githubAccessToken: process.env.GITHUB_ACCESS_TOKEN ?? "",
  githubAppId: process.env.GITHUB_APP_ID ?? "",
  githubAppClientId: process.env.GITHUB_APP_CLIENT_ID ?? "",
  githubAppSlug: process.env.GITHUB_APP_SLUG ?? "",
  githubAppPrivateKey: (process.env.GITHUB_APP_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  buildkitHost: process.env.BUILDKIT_HOST ?? "tcp://127.0.0.1:1234",
  runtimeNetworkName: process.env.NORTHSHIP_RUNTIME_NETWORK ?? "northship-runtime",
  secretKey: process.env.NORTHSHIP_SECRET_KEY ?? "",
  caddyConfigPath: resolve(process.env.CADDY_CONFIG_PATH ?? "data/Caddyfile"),
  caddyDataDir,
  caddyReloadCmd: process.env.CADDY_RELOAD_CMD ?? "caddy reload --config ./data/Caddyfile",
  updateRepoUrl: normalizeNorthshipRepoUrl(process.env.NORTHSHIP_UPDATE_REPO_URL ?? northshipRepoUrl),
  updateRepoBranch: process.env.NORTHSHIP_UPDATE_BRANCH ?? "main",
  updateRestartCmd: process.env.NORTHSHIP_UPDATE_RESTART_CMD ?? "",
  imageCommitSha: process.env.NORTHSHIP_COMMIT_SHA ?? "",
  imageUpdateCmd: process.env.NORTHSHIP_IMAGE_UPDATE_CMD ?? defaultImageUpdateCmd
};
