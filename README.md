# LaunchPad Lab Monorepo

This repository contains the minimum viable product scaffold for **LaunchPad Lab**, a
learning platform that combines Supabase, Cloudflare Workers, Vite + React, and a
Cloud Run based autograder.

## Directory structure

- `apps/frontend` – React + Vite dashboard for instructors and students.
- `apps/worker` – Cloudflare Worker REST API that fronts Supabase.
- `apps/grader` – Java 17 Maven project packaged for Cloud Run Jobs.
- `packages/shared` – Shared TypeScript types and Zod schemas.
- `infra` – Deployment descriptors (Wrangler, Cloud Run Job, CI workflow).
- `supabase` – SQL schema, RLS policies, and seed data for Supabase.

## Getting started

Install dependencies with npm workspaces:

```bash
npm install
```

### Frontend (Vite)

```bash
npm run -w @launchpad/frontend dev
```

Environment variables:

- `VITE_API_BASE_URL` – URL of the Cloudflare Worker API (defaults to
  `http://localhost:8787`).

### Cloudflare Worker API

```bash
cd apps/worker
npm install
npm run dev
```

Configure secrets in `infra/wrangler.toml` before deploying.

### Autograder

```bash
cd apps/grader
mvn clean package
```

The resulting shaded JAR is published at
`apps/grader/target/grader-0.1.0-SNAPSHOT-shaded.jar`. Use the provided Dockerfile to
build an image for Cloud Run Jobs.

## Supabase

Apply schema, policies, and seed data:

```bash
supabase db push supabase/schema.sql
supabase db push supabase/policies.sql
psql $SUPABASE_DB_URL -f supabase/seed.sql
```

Ensure Supabase Auth tokens include an `app_metadata.role` claim matching `STUDENT` or
`INSTRUCTOR` for Worker-side authorization.

## Continuous Integration

The GitHub Actions workflow (`infra/github/workflows/ci.yml`) installs npm
dependencies, builds the frontend, type-checks the Worker and shared package, and runs
Maven tests for the grader.
