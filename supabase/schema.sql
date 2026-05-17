-- ─── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Ideas ────────────────────────────────────────────────────────────────────
create table if not exists ideas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slug text not null,
  title text not null,
  content_encrypted text not null,
  summary_encrypted text not null,
  category text not null default 'other',
  tags text[] not null default '{}',
  connections text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);

-- ─── Idea Versions ────────────────────────────────────────────────────────────
create table if not exists idea_versions (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid references ideas(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content_encrypted text not null,
  summary_encrypted text not null,
  category text not null default 'other',
  tags text[] not null default '{}',
  connections text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── Vault Meta ───────────────────────────────────────────────────────────────
create table if not exists vault_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  index_md_encrypted text not null default '',
  overview_md_encrypted text not null default '',
  updated_at timestamptz not null default now()
);

-- ─── User Settings ────────────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  llm_config_encrypted text,
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table ideas enable row level security;
alter table idea_versions enable row level security;
alter table vault_meta enable row level security;
alter table user_settings enable row level security;

-- Ideas policies
create policy "Users can read own ideas"
  on ideas for select using (auth.uid() = user_id);

create policy "Users can insert own ideas"
  on ideas for insert with check (auth.uid() = user_id);

create policy "Users can update own ideas"
  on ideas for update using (auth.uid() = user_id);

create policy "Users can delete own ideas"
  on ideas for delete using (auth.uid() = user_id);

-- Idea versions policies
create policy "Users can read own idea versions"
  on idea_versions for select using (auth.uid() = user_id);

create policy "Users can insert own idea versions"
  on idea_versions for insert with check (auth.uid() = user_id);

-- Vault meta policies
create policy "Users can read own vault meta"
  on vault_meta for select using (auth.uid() = user_id);

create policy "Users can upsert own vault meta"
  on vault_meta for insert with check (auth.uid() = user_id);

create policy "Users can update own vault meta"
  on vault_meta for update using (auth.uid() = user_id);

-- User settings policies
create policy "Users can read own settings"
  on user_settings for select using (auth.uid() = user_id);

create policy "Users can upsert own settings"
  on user_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on user_settings for update using (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists ideas_user_id_idx on ideas(user_id);
create index if not exists ideas_category_idx on ideas(category);
create index if not exists ideas_created_at_idx on ideas(created_at desc);

-- ─── Migrations (idempotent) ──────────────────────────────────────────────────
alter table ideas add column if not exists is_favorite boolean not null default false;

create table if not exists idea_versions (
  id uuid primary key default uuid_generate_v4(),
  idea_id uuid references ideas(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content_encrypted text not null,
  summary_encrypted text not null,
  category text not null default 'other',
  tags text[] not null default '{}',
  connections text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table idea_versions enable row level security;

create policy if not exists "Users can read own idea versions"
  on idea_versions for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own idea versions"
  on idea_versions for insert with check (auth.uid() = user_id);

create index if not exists idea_versions_idea_id_idx on idea_versions(idea_id, created_at desc);

-- ─── pgvector ─────────────────────────────────────────────────────────────────
create extension if not exists vector;

-- Embedding column (768 dims — works for OpenAI 3-small, Google text-embedding-004, Ollama nomic-embed-text)
alter table ideas add column if not exists embedding vector(768);

-- IVFFlat index for fast approximate nearest-neighbour search
create index if not exists ideas_embedding_idx
  on ideas using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Embeddings config stored alongside LLM config
alter table user_settings add column if not exists embeddings_config_encrypted text;

-- ─── Semantic search function ────────────────────────────────────────────────
create or replace function search_ideas(
  p_user_id uuid,
  p_query_embedding vector(768),
  p_limit int default 10,
  p_threshold double precision default 0.3
)
returns table(id uuid, similarity double precision)
language sql
security invoker
stable
as $$
  select
    id,
    (1 - (embedding <=> p_query_embedding))::double precision as similarity
  from ideas
  where user_id = p_user_id
    and embedding is not null
    and (1 - (embedding <=> p_query_embedding)) > p_threshold
  order by embedding <=> p_query_embedding
  limit p_limit;
$$;

-- ─── Pairwise similarity function ─────────────────────────────────────────────
create or replace function get_pairwise_similarities(
  p_user_id uuid,
  p_threshold double precision default 0.3
)
returns table(id_a uuid, id_b uuid, similarity double precision)
language sql
security invoker
stable
as $$
  select
    a.id as id_a,
    b.id as id_b,
    (1 - (a.embedding <=> b.embedding))::double precision as similarity
  from ideas a
  cross join ideas b
  where a.user_id = p_user_id
    and b.user_id = p_user_id
    and a.id < b.id
    and a.embedding is not null
    and b.embedding is not null
    and (1 - (a.embedding <=> b.embedding)) > p_threshold;
$$;
