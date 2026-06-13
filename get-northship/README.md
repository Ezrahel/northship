# get-northship

Tiny Node app for:

```bash
curl -fsSL https://get.northship.dev | sh
```

Deploy this directory anywhere that can serve `get.northship.dev`.

The served installer clones `ezrahel/northship`, builds it on the VPS, runs the control plane with systemd, and keeps Docker Compose only for BuildKit and Caddy.

## Routes

- `GET /` serves `install.sh`
- `GET /install.sh` serves `install.sh`
- `GET /healthz` returns `ok`

## Analytics

Set `POSTHOG_API_KEY` to capture installer requests in PostHog.

Optional env:

- `POSTHOG_HOST`: PostHog host, defaults to the SDK default.
- `POSTHOG_DISABLED=true`: disables analytics even when a key is present.
- `POSTHOG_DISTINCT_ID_SALT`: custom salt for hashed installer identities.

The app captures `get_northship_installer_requested` for successful `GET /` and `GET /install.sh` requests. It does not send raw IP addresses; request identity is hashed before being sent.

## Run

```bash
npm start
```

The app listens on `PORT`, defaulting to `3000`.

## Installer Options

Common options passed to `sh`:

```bash
curl -fsSL https://get.northship.dev | \
  NORTHSHIP_REPO_BRANCH=main \
  NORTHSHIP_PUBLIC_URL=https://pilot.example.com \
  sh
```

- `NORTHSHIP_HOME`: install directory, default `/opt/northship`
- `NORTHSHIP_REPO_URL`: Git repository to clone
- `NORTHSHIP_REPO_BRANCH`: branch to install and update from
- `NORTHSHIP_PUBLIC_URL`: initial public URL written into the environment
- `NORTHSHIP_PORT`: control-plane port, default `4310`

## Docker

```bash
docker build -t get-northship .
docker run -p 3000:3000 -e POSTHOG_API_KEY=phc_... get-northship
```
