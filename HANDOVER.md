# Idea Vault — Handover

Multi-user AI knowledge base: users capture raw thoughts, an LLM structures them into interlinked markdown pages grounded in
the user's related ideas, and the vault is shown as a force-directed graph. See `README.md` for the overview, security model
and limitations, and `DEPLOYMENT.md` for Vercel setup.

## Stack

Next.js 16 (App Router, TypeScript; **`proxy.ts`, not `middleware.ts`**) · Supabase (Auth, Postgres, pgvector, RLS) ·
BYOK LLMs (Anthropic, OpenAI, Google, Ollama) and embeddings (OpenAI, Google, Ollama; `vector(768)`) · D3 · vitest ·
Vercel (primary) / Docker + Nginx (self-host).

## State: what works

- **Capture** (`lib/vault/index.ts`): embed raw note → top-8 candidates via pgvector (`lib/vault/retrieval.ts`, keyword fallback)
  → one LLM call with structured output (`lib/vault/structure.ts`) → zod validation + one retry (`lib/vault/schema.ts`) →
  drop unknown connections, unique slug → save with embedding + `embedding_model`/`embedding_dim` → rebuild `index.md` from the DB.
- **Overview**: generated on demand (`POST /api/vault/overview`, Refresh button), input/output size-capped.
- **Search**: semantic or hybrid (`search_ideas`, `search_ideas_hybrid`), model-aware (never mixes embedding models), similarity shown.
- **Embeddings maintenance**: `GET /api/embeddings/status`; `POST /api/embeddings/backfill` embeds missing **and stale** vectors in batches of 50
  (the Settings button loops until `remaining` is 0).
- **Graph**: `app/api/ideas/graph/route.ts` with weights in `lib/graph/scoring.ts`; `get_pairwise_similarities` is capped (top-k per node, max pairs).
- **Versioning**: `idea_versions` rows written on PATCH; `GET /api/ideas/[slug]/versions`.
- **Demo**: `npm run seed:demo`; "Try the demo" → `POST /api/demo` mints a one-time token for `DEMO_USER_ID` (no password). Read-only via
  `lib/auth/demo.ts` guards and restrictive RLS (`supabase/migrations/20261028_demo_readonly.sql`).
- **Security**: AES-256-GCM + HKDF (`lib/encryption`), per-user rate limits (`lib/rate-limit.ts`, `check_rate_limit` RPC), safe markdown
  (`components/Markdown.tsx`), SSRF guard for provider URLs (`lib/url-guard.ts`), keys never returned to the client.
- **Observability**: `lib/observability.ts` logs a JSON line per model call and stores it in `llm_usage`; Settings shows a 30-day summary.
- **Tests / eval**: `npm test`, `npm run test:rls` (opt-in), `npm run eval`.

## Key decisions

1. `proxy.ts` (Next 16) runs on the Node.js runtime; the export is named `proxy`.
2. Browser and server Supabase clients are split (`lib/supabase/client.ts` vs `server.ts`); never import `next/headers` in client code.
   Client components must not import modules that pull in Node built-ins (e.g. `lib/url-guard.ts`); model lists live in `lib/embeddings/models.ts`.
3. Embeddings are 768-dim. OpenAI is asked for `dimensions: 768`; other sizes are skipped, not truncated.
4. Embeddings are generated **before** saving, because work after the response is not guaranteed on serverless.
5. Encryption: `v2:` + base64(iv|tag|ciphertext). Legacy CryptoJS rows are still readable and are rewritten by `npm run migrate:encryption`.
   Titles, tags, categories, slugs, connections and embeddings are plaintext by design (queryable).
6. Demo sign-in uses the service-role key server-side only (`lib/supabase/admin.ts`).

## Environment variables

See `.env.local.example` and `DEPLOYMENT.md`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_SECRET`, `NEXT_PUBLIC_APP_URL`. Optional: `DEMO_USER_ID` / `DEMO_USER_EMAIL`, `ALLOW_PRIVATE_LLM_URLS` (self-host only).

## Database

`supabase/schema.sql` then `supabase/migrations/*` in order (embedding metadata, demo read-only, rate limits, search quality, llm_usage).
The vector/hybrid SQL has not been run against a real pgvector instance in CI; the rate-limit and demo-policy SQL was exercised on a scratch Postgres.

## Open items

- [ ] Deploy to Vercel; set the region next to the Supabase project; add the live URL and screenshots to the README.
- [ ] Run `npm run seed:demo`, `npm run migrate:encryption` (existing data) and `npm run check:similarity` against the real project; tune `SEMANTIC_THRESHOLD` / `SEARCH_THRESHOLD` if needed.
- [ ] Run `npm run eval` with real keys and paste the table into the README.
- [ ] Run `npm run test:rls` against a development Supabase project.
- [ ] Remove `app/mockup/page.tsx` (design mock, not part of the product).
- [ ] `Dockerfile` copies `.next/standalone` but `next.config.ts` does not set `output: 'standalone'`; fix before relying on the Docker path (it also uses Node 20).
- [ ] Pre-existing lint error: `app/dashboard/page.tsx` calls `fetchData()` (which sets state) directly in an effect.
- [ ] Nice to have: per-visitor ephemeral demo copies, a demo embeddings key with a spend cap, idea editing UI, client-side encryption.

## Notes for Claude Code

- Read `node_modules/next/dist/docs/` before writing Next.js code; this version has breaking changes.
- Run `npx tsc --noEmit`, `npm test` and `npx next build` before considering anything done.
