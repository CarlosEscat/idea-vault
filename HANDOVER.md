# Idea Vault — Claude Code Handover

## What is Idea Vault?

A multi-user AI-powered knowledge base inspired by **Andrej Karpathy's LLM Wiki** concept. Users capture raw thoughts, and an AI structures them into interlinked markdown pages visualised as a force-directed knowledge graph. Connections are **semantically meaningful** — computed via vector embeddings and a four-signal scoring algorithm.

**Core user experience:**
1. User dumps a raw thought
2. AI structures it into a wiki-style markdown page
3. The knowledge graph updates — showing genuine semantic connections to existing ideas
4. AI surfaces gaps: areas the user hasn't explored yet
5. User can click any node to read and expand that idea

---

## Tech Stack

```
Next.js 16 (App Router, TypeScript) — NOTE: uses "proxy.ts" not "middleware.ts"
Supabase (Auth + Postgres + pgvector + RLS)
AES-256 server-side encryption (per-user derived keys)
LLM agnostic — BYOK (Anthropic, OpenAI, Google, Ollama)
Embeddings — BYOK (OpenAI, Google, Ollama) — stored as vector(768)
D3.js (force-directed knowledge graph visualisation)
Docker + Nginx (VPS deployment)
```

---

## Current State — What Is Fully Working

Everything below has been built and is functional end-to-end:

### Infrastructure
- `proxy.ts` — auth route protection (Next.js 16 uses `proxy.ts`, not `middleware.ts`)
- `lib/supabase/client.ts` — browser-only Supabase client
- `lib/supabase/server.ts` — server-only Supabase client (uses `next/headers`)
- `lib/encryption/index.ts` — AES-256 encrypt/decrypt with per-user keys
- `supabase/schema.sql` — complete schema including pgvector (`vector(768)`), IVFFlat index, `get_pairwise_similarities` RPC function

### Auth
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `app/auth/callback/route.ts`

### LLM + Embeddings
- `lib/llm/providers.ts` — Anthropic, OpenAI, Google, Ollama
- `lib/embeddings/providers.ts` — OpenAI, Google, Ollama
  - Google uses direct REST fetch to `v1` (not `v1beta`) — required for `text-embedding-004`
  - OpenAI requests `dimensions: 768` to match the DB column
  - All providers produce 768-dim vectors
- `app/api/llm/route.ts` — GET/POST with `__keep__` sentinel for existing keys
- `app/api/embeddings/route.ts` — GET/POST, same pattern as LLM route

### Vault
- `lib/vault/index.ts` — full capture flow: LLM structures idea, saves to DB, generates embedding (fire-and-forget), updates `index.md` and `overview.md`
- `lib/vault/prompts.ts` — system prompts
- `app/api/ideas/capture/route.ts` — fetches both LLM + embeddings config, passes to capture flow
- `app/api/ideas/graph/route.ts` — **four-signal composite scorer**: direct links (35%), semantic/pgvector (40%), tag overlap (15%), type affinity (10%). Direct links always draw an edge regardless of threshold.
- `app/api/ideas/[slug]/route.ts` — DELETE endpoint
- `app/api/vault/route.ts` — list all ideas (decrypted)
- `app/api/export/route.ts` — export vault as zip of MD files

### UI
- `components/layout/Sidebar.tsx`
- `components/vault/CaptureInput.tsx`
- `components/vault/IdeaRow.tsx`
- `components/vault/IdeaDetail.tsx` — renders markdown via `react-markdown`, has delete with confirmation
- `components/vault/StatCard.tsx`
- `components/vault/SuggestedGaps.tsx`
- `components/graph/KnowledgeGraph.tsx` — weighted edges (distance/opacity/stroke-width scale with `strength`)
- `app/dashboard/page.tsx` — onboarding nudge when no LLM configured, fetches vault directly
- `app/settings/page.tsx` — LLM section + Embeddings section, both with `__keep__` sentinel handling
- `app/graph/page.tsx` — knowledge graph view
- `app/vault/page.tsx` — list view

### Types
- `types/index.ts` — all types including `GraphLink.strength: number`, `EmbeddingsConfig`, `EmbeddingsProviderType`

---

## Key Architectural Decisions

1. **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed middleware to proxy. The export is named `proxy`, not `middleware`.

2. **Split Supabase clients** — `lib/supabase/client.ts` is browser-only (no `next/headers`). `lib/supabase/server.ts` is server-only. Never mix them.

3. **Embeddings are 768 dimensions** — the DB column is `vector(768)`. OpenAI's `text-embedding-3-small` is called with `dimensions: 768`. Google's `text-embedding-004` natively produces 768 dims. Ollama's `nomic-embed-text` also produces 768.

4. **Google embeddings use REST v1** — the `@google/generative-ai` SDK uses `v1beta` which doesn't support `text-embedding-004`. The `GoogleEmbeddingsProvider` calls `https://generativelanguage.googleapis.com/v1/models/...` directly.

5. **Encryption** — all idea content (title, summary, content) encrypted with AES-256. Key = `ENCRYPTION_SECRET + user_id`. Embeddings are NOT encrypted (pgvector needs raw floats).

6. **BYOK** — users supply their own API keys. Keys stored encrypted in `user_settings.llm_config_encrypted` / `embeddings_config_encrypted`.

7. **RLS** — all tables have Row Level Security. `get_pairwise_similarities` uses `security invoker` so RLS applies.

8. **Fire-and-forget embeddings** — embedding generation runs after the capture response is sent. Failures are logged but don't break the capture flow.

9. **Graph edge logic** — any direct link (even one-sided) always draws an edge. The composite threshold (0.25) only gates edges discovered purely via semantic/tag signals.

10. **Styling** — inline styles with CSS variables from `globals.css`. No Tailwind in practice. Design: Lora serif body, DM Mono labels, `#faf9f6` paper background.

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_SECRET=          # 32+ char random string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Supabase Schema Notes

The full schema is in `supabase/schema.sql`. Key additions beyond standard tables:

```sql
-- pgvector extension
create extension if not exists vector;

-- 768-dim embedding column on ideas
alter table ideas add column if not exists embedding vector(768);

-- Embeddings config on user_settings
alter table user_settings add column if not exists embeddings_config_encrypted text;

-- Pairwise similarity function (called by graph route via supabase.rpc)
create or replace function get_pairwise_similarities(p_user_id uuid, p_threshold double precision default 0.3)
returns table(id_a uuid, id_b uuid, similarity double precision) ...
```

---

## Remaining Work

### Should have (UX quality)

- [ ] **`app/loading.tsx` + `app/error.tsx`** — Next.js loading/error boundaries. Currently pages show nothing while fetching.

- [ ] **Show `overview.md` in graph page** — `overview.md` is generated and stored on every capture but never displayed. Suggested: collapsible panel on the left side of `/graph`. Fetch from a new `GET /api/vault/meta` endpoint that returns decrypted `overview_md` from `vault_meta`.

- [ ] **Backfill embeddings** — ideas captured before embeddings were configured have no embedding. Add a `POST /api/embeddings/backfill` endpoint that iterates all ideas without embeddings, generates them, and saves. Add a button in Settings to trigger it.

### Nice to have

- [ ] **Idea editing** — allow modifying idea content from `IdeaDetail`. Would need a `PATCH /api/ideas/[slug]` endpoint and an edit mode in the component.

- [ ] **Mobile-responsive layout** — currently desktop-only. Sidebar collapses needed.

- [ ] **Vault search** — full-text or vector search across ideas. Could use pgvector nearest-neighbour query against a query embedding, or Supabase's built-in full-text search.

- [ ] **Idea versioning / history** — track how ideas evolve over time.

---

## Recommended First Steps

1. Run `npm install` and `npm run dev`
2. The app runs on `http://localhost:3000`
3. Sign up, go to Settings, configure both LLM and Embeddings providers
4. Start with `overview.md` panel — highest value, quickest win
5. Then loading/error boundaries
6. Then backfill embeddings endpoint

---

## Notes for Claude Code

- Read `node_modules/next/dist/docs/` before writing any Next.js code — this version (16.x) has breaking changes
- Always split browser/server Supabase clients — importing `next/headers` in a client component crashes the build
- TypeScript is strict — run `npx tsc --noEmit` before considering anything done
- Dev server logs go to `/tmp/idea-vault-dev.log` when started with `npm run dev > /tmp/idea-vault-dev.log 2>&1 &`
