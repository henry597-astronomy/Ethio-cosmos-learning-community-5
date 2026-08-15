# EthioCosmos Security Hardening Deployment

This change set hardens the existing application without changing its visual design. The frontend still uses the same authentication, AI chat, live-stream, and storage flows, but privileged work is now verified on the server or in Supabase RLS policies.

## Required deployment configuration

Set these variables in the Vercel project for the API runtime. They must not be exposed with a `VITE_` prefix unless the value is intentionally public.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` or existing `VITE_SUPABASE_URL` | Supabase project URL used to validate sessions. |
| `SUPABASE_ANON_KEY` or existing `VITE_SUPABASE_ANON_KEY` | Supabase public key used together with the caller's bearer token for JWT-backed queries. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by the owner-bound live-session cleanup endpoint. Never put this in frontend variables. |
| `GROQ_API_KEY` | Server-only Groq key used by `/api/groq`. Do not configure `VITE_GROQ_API_KEY`. |
| `LIVEKIT_API_KEY` | Server-only LiveKit project key. |
| `LIVEKIT_API_SECRET` | Server-only LiveKit signing secret. |
| `CORS_ALLOWED_ORIGINS` | Optional comma-separated list for any additional trusted web origins. Capacitor and the existing Vercel origin are already included. |

The previously embedded Groq credential must be revoked and replaced in the Groq provider dashboard. Do this after the new server variable is available so the AI feature has a valid replacement key during deployment.

## Supabase migration order

Apply `supabase/security_hardening.sql` in the Supabase SQL Editor after confirming that the project has the `profiles`, `live_sessions`, `shorts`, and `storage.objects` objects used by the existing app. The migration is designed to be re-runnable. It keeps public profile reads, authenticated owner profile edits, authenticated live-stream creation, and public reads of active live sessions, while preventing role and block-status escalation.

The storage portion intentionally changes uploads in the `uploads` and `shorts` buckets to active-administrator-only creation. Existing public reads are preserved. Existing owner-based deletion is preserved, and active administrators retain content-management deletion through the replacement policies.

## Safe release order

First, add the server-only Vercel variables and deploy the application code. Second, apply the Supabase migration. Third, test login, profile editing, AI chat, starting and joining a live stream, stopping a live stream, and the administrator content workflows. Finally, revoke the old exposed Groq credential and remove any obsolete provider key from all deployment environments.

If the database migration has not yet been applied, the application code will fail closed for protected token issuance rather than trusting client-supplied identity. The existing UI remains available for ordinary browsing and authentication.

## Verification commands

From the repository root, the following checks are available:

```bash
node scripts/security-regression-check.mjs
./node_modules/.bin/tsc -b --pretty false
node ./node_modules/typescript/bin/tsc -p tsconfig.server-check.json --pretty false
./node_modules/.bin/vite build
./node_modules/.bin/vitest run --passWithNoTests
```

The normal `pnpm build` command was also attempted during review, but the sandbox's package-manager policy stopped dependency install scripts for `esbuild`. The direct compiler, Vite build, server typecheck, syntax checks, regression checks, and existing Vitest suite completed successfully.
