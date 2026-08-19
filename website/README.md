# Northship Website

Astro landing page for Northship.

## Run locally

```bash
cd website
npm install
npm run dev
```

## Analytics

PostHog tracking is enabled when `PUBLIC_POSTHOG_KEY` is set. Copy `.env.example` to `.env`
for local development, or set these variables on the deployed website service:

```bash
PUBLIC_POSTHOG_KEY=phc_your_project_key
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
PUBLIC_POSTHOG_DEFAULTS=2026-01-30
```

Astro includes `PUBLIC_*` variables at build time, so redeploy after changing these values.

## Build

```bash
npm run build
```

## Deployment

This project is an Astro site under the website folder. For PXXL, build it from that folder instead of the repository root.

Use these settings in PXXL:

- Install command: `cd website && npm install`
- Build command: `cd website && npm run build`
- Output directory: `website/dist`
- Node.js version: `20` or `22`

If your project only exposes a single build command field, use:

```bash
cd website && npm install && npm run build
```

and set the publish/output directory to `website/dist`.
