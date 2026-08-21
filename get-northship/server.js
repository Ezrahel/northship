import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { captureInstallerRequest, shutdownAnalytics } from "./analytics.js";

const appDir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const configuredScriptPath = process.env.INSTALL_SCRIPT_PATH || "install.sh";
const scriptPath = isAbsolute(configuredScriptPath)
  ? configuredScriptPath
  : resolve(appDir, configuredScriptPath);

let cachedScript = null;

async function installerScript() {
  if (cachedScript && process.env.NODE_ENV === "production") {
    return cachedScript;
  }

  const script = await readFile(scriptPath, "utf8");
  if (process.env.NODE_ENV === "production") {
    cachedScript = script;
  }
  return script;
}

function send(res, status, headers, body, method) {
  res.writeHead(status, headers);
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.CORS_ALLOW_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

function textHeaders(extra = {}) {
  return {
    "Cache-Control": "public, max-age=300",
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...corsHeaders,
    ...extra
  };
}

const handler = async (req, res) => {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (method === "OPTIONS") {
    send(res, 204, textHeaders({ "Cache-Control": "no-store" }), "", method);
    return;
  }

  if (!["GET", "HEAD"].includes(method)) {
    send(res, 405, textHeaders({ Allow: "GET, HEAD, OPTIONS" }), "Method not allowed\n", method);
    return;
  }

  if (url.pathname === "/healthz") {
    send(res, 200, textHeaders({ "Cache-Control": "no-store" }), "ok\n", method);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/install.sh") {
    try {
      const script = await installerScript();
      captureInstallerRequest(req, url);
      send(res, 200, textHeaders(), script, method);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read installer";
      send(res, 500, textHeaders({ "Cache-Control": "no-store" }), `Unable to read installer: ${message}\n`, method);
    }
    return;
  }

  send(res, 404, textHeaders({ "Cache-Control": "no-store" }), "Not found\n", method);
};

async function main() {
  const tlsCertPath = process.env.TLS_CERT_PATH;
  const tlsKeyPath = process.env.TLS_KEY_PATH;

  let server;
  let protocol;

  if (tlsCertPath && tlsKeyPath) {
    const [cert, key] = await Promise.all([
      readFile(tlsCertPath, "utf8"),
      readFile(tlsKeyPath, "utf8")
    ]);
    server = createHttpsServer({ cert, key }, handler);
    protocol = "https";
  } else {
    server = createHttpServer(handler);
    protocol = "http";
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`get-northship listening on ${protocol}://0.0.0.0:${port}`);
  });

  let shuttingDown = false;

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;

      void shutdownAnalytics()
        .catch(() => undefined)
        .finally(() => {
          server.close(() => process.exit(0));
        });

      setTimeout(() => process.exit(0), 2500).unref();
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
