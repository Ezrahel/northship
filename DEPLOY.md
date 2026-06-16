# Deploying Northship to Coolify

This guide walks you through deploying both parts of Northship to Coolify:

- **Control Plane** — the dashboard and API (port `4310`, built from `Dockerfile`)
- **Website** — the marketing and docs landing page (Astro static site in `website/`)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Prepare Your Repository](#2-prepare-your-repository)
3. [Deploy the Control Plane](#3-deploy-the-control-plane)
   - 3.1 [Create a Coolify Compose File](#31-create-a-coolify-compose-file)
   - 3.2 [Create a New Resource in Coolify](#32-create-a-new-resource-in-coolify)
   - 3.3 [Configure Build Settings](#33-configure-build-settings)
   - 3.4 [Set Environment Variables](#34-set-environment-variables)
   - 3.5 [Configure Volume & Docker Socket](#35-configure-volume--docker-socket)
   - 3.6 [Configure Domain](#36-configure-domain)
   - 3.7 [Deploy](#37-deploy)
4. [Run Onboarding](#4-run-onboarding)
5. [Deploy the Website (Landing Page)](#5-deploy-the-website-landing-page)
6. [Connect Your GitHub App](#6-connect-your-github-app)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

Before starting, make sure you have:

- [ ] A running **Coolify** instance on a VPS (see [coolify.io/docs](https://coolify.io/docs))
- [ ] Your code pushed to **`github.com/ezrahel/northship`**
- [ ] The GitHub repository connected to your Coolify instance
- [ ] A domain name pointed at your Coolify VPS (optional but recommended)
- [ ] Docker and Docker Compose available on the Coolify VPS

> **Why Docker socket access?**  
> Northship manages containers on your server (building apps, running databases). It needs
> access to the host Docker daemon via `/var/run/docker.sock`. This is the same socket
> Coolify itself uses — both will share the host Docker.

---

## 2. Prepare Your Repository

Northship needs a Coolify-specific Docker Compose file that:
- Runs the control plane (built from `Dockerfile`)
- Runs **BuildKit** as a companion service (required for building deployments)
- Mounts the Docker socket and a persistent data volume
- Disables the built-in Caddy manager (Coolify handles routing and SSL)

Create the file `docker-compose.coolify.yml` in the project root:

```yaml
services:
  northship:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "4310"
      HOST: "0.0.0.0"
      DATA_DIR: /data
      BUILDKIT_HOST: tcp://buildkit:1234
      CADDY_RELOAD_CMD: "true"
      PUBLIC_URL: ${PUBLIC_URL}
      NORTHSHIP_SECRET_KEY: ${NORTHSHIP_SECRET_KEY}
      NORTHSHIP_RUNTIME_NETWORK: northship-runtime
    volumes:
      - northship_data:/data
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - buildkit

  buildkit:
    image: moby/buildkit:latest
    restart: unless-stopped
    privileged: true
    command: ["--addr", "tcp://0.0.0.0:1234"]

volumes:
  northship_data:
```

Commit and push this file to your repository:

```bash
git add docker-compose.coolify.yml
git commit -m "add coolify deployment compose file"
git push
```

---

## 3. Deploy the Control Plane

### 3.1 Create a New Resource in Coolify

1. Open your Coolify dashboard
2. Go to your **Project** → click **+ New Resource**
3. Select **Docker Compose**
4. Choose **GitHub** as the source
5. Select the repository: `ezrahel/northship`
6. Select branch: `main`

### 3.2 Configure Build Settings

In the resource configuration:

| Setting | Value |
|---|---|
| **Compose File** | `docker-compose.coolify.yml` |
| **Service to expose** | `northship` |
| **Port** | `4310` |

### 3.3 Set Environment Variables

In the **Environment Variables** section, add the following.  
Variables marked **required** must be set before the first deploy.

#### Required

| Variable | Value | Notes |
|---|---|---|
| `NORTHSHIP_SECRET_KEY` | *(generated)* | Run `openssl rand -base64 32` and paste the output |
| `PUBLIC_URL` | `https://your-domain.com` | The public URL where the dashboard is accessible |

Generate the secret key on your machine:

```bash
openssl rand -base64 32
```

#### Optional — GitHub App (can be added after onboarding)

| Variable | Value |
|---|---|
| `GITHUB_APP_ID` | Your GitHub App's numeric ID |
| `GITHUB_APP_CLIENT_ID` | Your GitHub App's Client ID |
| `GITHUB_APP_SLUG` | Your GitHub App's slug (from its URL) |
| `GITHUB_APP_PRIVATE_KEY` | Contents of the `.pem` file (paste as-is, with newlines) |
| `GITHUB_WEBHOOK_SECRET` | The webhook secret you set when creating the GitHub App |

#### Optional — Fine-tuning

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `4310` | Control plane port |
| `DATA_DIR` | `/data` | Persistent storage path inside the container |
| `DEPLOY_DRY_RUN` | `false` | Set `true` to disable real deployments (useful for testing) |
| `NORTHSHIP_RUNTIME_NETWORK` | `northship-runtime` | Docker network for deployed services |
| `NORTHSHIP_UPDATE_REPO_URL` | `https://github.com/ezrahel/northship.git` | Repo used for self-updates |
| `NORTHSHIP_UPDATE_BRANCH` | `main` | Branch used for self-updates |

### 3.4 Configure Volume & Docker Socket

Coolify sets up the named volume `northship_data` automatically from the compose file.

The Docker socket (`/var/run/docker.sock:/var/run/docker.sock`) is declared in the compose file and will be mounted automatically. Confirm it appears in Coolify's **Volumes** or **Advanced** tab.

> ⚠️ **Security note:** Mounting the Docker socket gives Northship full control over the host Docker daemon. Only do this on a server you control and trust.

### 3.5 Configure Domain

1. In Coolify, go to the **Domains** tab of your resource
2. Add your domain, e.g. `pilot.northship.dev`
3. Make sure your DNS has an **A record** pointing to the Coolify VPS IP:
   ```
   A    pilot.northship.dev    YOUR_VPS_IP
   ```
4. Coolify will handle SSL automatically via Let's Encrypt

> If you don't have a domain yet, Coolify provides a generated subdomain on its own domain,
> e.g. `https://abc123.yourcoolify.instance`. Use that as `PUBLIC_URL` for now.

### 3.6 Deploy

1. Click **Deploy** in Coolify
2. Watch the build logs — the first build takes ~3–5 minutes (Node.js build + Railpack install)
3. Once the status turns **Running**, the control plane is live

---

## 4. Run Onboarding

1. Open your `PUBLIC_URL` in the browser (e.g. `https://pilot.northship.dev`)
2. You will be taken to the **onboarding wizard** — complete each step:

   - **Create owner account** — set your username and password
   - **Dashboard domain** — enter `pilot.northship.dev` (or your domain)
   - **Wildcard root domain** — enter `*.pilot.northship.dev` if you want auto-generated service URLs
   - **BuildKit** — should auto-detect as `tcp://buildkit:1234` *(already set via env)*
   - **GitHub** — skip for now, or paste your GitHub App credentials
   - **Runtime network** — leave as `northship-runtime`

3. Click **Finish** — you're in the dashboard

> After onboarding the raw `http://VPS_IP:4310` URL is still available as a fallback
> if your domain has issues.

---

## 5. Deploy the Website (Landing Page)

The `website/` directory is a separate **Astro** static site.

### Option A — Coolify Static Site (recommended)

1. In Coolify, create a **+ New Resource** → **Application**
2. Source: **GitHub** → `ezrahel/northship`
3. Build type: **Static**
4. Configure:

   | Setting | Value |
   |---|---|
   | **Base directory** | `website` |
   | **Install command** | `npm install` |
   | **Build command** | `npm run build` |
   | **Publish directory** | `dist` |

5. Add a domain (e.g. `northship.dev` or `www.northship.dev`)
6. Click **Deploy**

### Option B — Docker (if you prefer a container)

Create `website/Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

Then in Coolify create a new resource using **Dockerfile**, set the **Base directory** to `website`, and expose port `80`.

---

## 6. Connect Your GitHub App

If you skipped GitHub setup during onboarding:

1. Go to **System Settings** → **GitHub** in the Northship dashboard
2. Paste your:
   - **App ID**
   - **Client ID**
   - **App Slug**
   - **Private Key** (`.pem` contents)
   - **Webhook Secret**
3. Click **Save**
4. Click **Install App** and grant access to the repositories you want to deploy

Make sure your GitHub App's **Webhook URL** is set to:
```
https://pilot.northship.dev/api/github/app/webhook
```

---

## 7. Troubleshooting

### Container starts but dashboard is unreachable

- Check that `PUBLIC_URL` matches the domain Coolify is serving
- Verify the A record is pointing to the correct VPS IP
- Check Coolify's proxy logs for routing errors

### "BuildKit connection refused" error

- Confirm `BUILDKIT_HOST=tcp://buildkit:1234` is set in env variables
- Check that the `buildkit` service is running: look at Coolify's compose logs
- The `buildkit` container requires `privileged: true` — confirm Coolify allows privileged containers on your VPS

### Docker socket permission denied

- The Northship container runs as the default node user. If you get socket permission errors, add the user to the `docker` group or run the container as root by adding `user: root` under the `northship` service in `docker-compose.coolify.yml`

### Webhook events not arriving

- Your GitHub App's Webhook URL must be publicly reachable
- Confirm `GITHUB_WEBHOOK_SECRET` in Northship matches the secret set in the GitHub App
- Check webhook delivery logs in GitHub → Your App → **Advanced** → **Recent Deliveries**

### "NORTHSHIP_SECRET_KEY is not set" error

- This variable is required. Generate it with `openssl rand -base64 32` and add it to Coolify's environment variables, then redeploy

### Website audit vulnerabilities (esbuild)

These are dev-server-only vulnerabilities that do not affect the built static output served in production. They can safely be ignored.

---

## Architecture Overview

```
Coolify VPS
├── Coolify (manages routing, SSL, deployments)
│   ├── northship (control plane, port 4310)  ← this guide
│   │   └── /data volume (SQLite DB, Caddyfile, backups)
│   ├── buildkit (companion build service)    ← this guide
│   └── website (Astro static site)           ← this guide
└── Docker host (shared with Coolify)
    └── northship-runtime network
        └── services deployed by Northship (your apps, databases)
```
