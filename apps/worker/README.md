# Cloudflare Worker API

Cloudflare Worker that exposes a minimal assignment workflow backed by Supabase REST.

## Requirements

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Supabase project with assignments/submissions/grades tables.

## Environment

Set the following bindings in Wrangler or the Cloudflare dashboard:

- `SUPABASE_URL` – base URL of the Supabase project (e.g. `https://xyz.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` – service role key used for server-side REST access

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Deployment

```bash
npm run deploy
```
