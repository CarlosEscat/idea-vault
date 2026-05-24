# 🔐 Idea Vault

> Your AI-powered thought companion. Capture, connect, and grow your ideas.

Idea Vault is a personal knowledge base inspired by Andrej Karpathy's LLM Wiki concept. It uses AI to structure your raw thoughts into interlinked markdown pages, visualized as a force-directed knowledge graph.

**Key features:**
- 🧠 Capture raw thoughts → AI structures them into wiki-style pages
- 🕸️ Force-directed knowledge graph — see how ideas connect
- 🔐 Server-side encrypted vault per user
- 🤖 LLM agnostic — bring your own API key (Anthropic, OpenAI, Google, Ollama)
- 📦 Export your entire vault as `.md` files anytime
- 🚀 Self-hostable on any VPS

---

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Supabase** (Auth + Postgres + RLS)
- **AES-256 encryption** (server-side, per-user keys)
- **D3.js** (force-directed knowledge graph)
- **Tailwind CSS v4**
- **Docker + Nginx** (deployment)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/yourusername/idea-vault
cd idea-vault
npm install
```

### 2. Set up Supabase

1. Create a project at supabase.com
2. Run the schema: `supabase/schema.sql`
3. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.local.example .env.local
# Edit with your values
# Generate ENCRYPTION_SECRET: openssl rand -base64 32
```

### 4. Run locally

```bash
npm run dev
```

---

## Deploying to VPS

```bash
# 1. Clone on VPS, configure .env.local
# 2. Update nginx.conf with your domain
# 3. Get SSL: certbot certonly --standalone -d yourdomain.com
# 4. Build and start
docker-compose up -d --build
```

---

## Project Structure

```
idea-vault/
├── app/
│   ├── api/
│   │   ├── embeddings/route.ts             # POST: generate embeddings
│   │   ├── embeddings/backfill/route.ts    # POST: backfill embeddings
│   │   ├── export/route.ts                 # GET: export vault as MD
│   │   ├── ideas/capture/route.ts          # POST: capture new idea
│   │   ├── ideas/graph/route.ts            # GET: graph data
│   │   ├── ideas/[slug]/route.ts           # GET/PATCH/DELETE: single idea
│   │   ├── ideas/[slug]/versions/route.ts  # GET: idea version history
│   │   ├── llm/route.ts                    # GET/POST: LLM settings
│   │   ├── vault/route.ts                  # GET: all ideas
│   │   ├── vault/meta/route.ts             # GET: vault metadata
│   │   └── vault/search/route.ts           # GET: semantic search
│   ├── auth/{login,signup}/
│   ├── dashboard/
│   ├── vault/
│   ├── graph/
│   └── settings/
├── lib/
│   ├── supabase/client.ts           # Browser + server clients
│   ├── encryption/index.ts          # AES-256 encrypt/decrypt
│   ├── embeddings/providers.ts      # Embedding provider abstraction
│   ├── llm/providers.ts             # LLM abstraction (BYOK)
│   ├── tagColor.ts                  # Tag colour helpers
│   └── vault/
│       ├── index.ts                 # Core vault logic
│       └── prompts.ts               # System prompts
├── types/index.ts
├── supabase/schema.sql              # DB schema + RLS policies
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

---

## LLM Providers (BYOK)

| Provider | Models |
|---|---|
| Anthropic | claude-sonnet-4, claude-opus-4, claude-haiku-4-5 |
| OpenAI | gpt-4o, gpt-4o-mini, o3, o4-mini |
| Google | gemini-2.0-flash, gemini-2.5-pro |
| Ollama | llama3.3, mistral, qwen2.5 (local) |

---

## Security

- **RLS**: Postgres enforces data isolation at DB level
- **AES-256**: All content and API keys encrypted at rest
- **Per-user keys**: `ENCRYPTION_SECRET + user_id` → unique key per user
- **HTTPS**: Nginx + Let's Encrypt

---

## Roadmap

- [x] Core vault logic (capture → structure → save)
- [x] LLM abstraction layer (BYOK)
- [x] Server-side encryption
- [x] Export vault as `.md` files
- [x] Force-directed knowledge graph UI
- [x] Idea detail panel (click node → read + expand)
- [x] Gap surfacing ("You haven't explored X yet")
- [x] Vault search (semantic)
- [x] Idea versioning
- [ ] Mobile capture

---

## License

MIT
