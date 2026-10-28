-- Search & graph quality: HNSW index, model-aware vector queries, capped pairwise similarities,
-- hybrid (full-text + vector) search, and embedding status helpers.
-- All functions are SECURITY INVOKER, so RLS still scopes every row to the caller.

-- ─── HNSW instead of IVFFlat ─────────────────────────────────────────────────
-- IVFFlat needs `lists` tuned to the row count and degrades on small tables; HNSW has no training step.
-- Note: queries filter by user_id, so for small per-user vaults Postgres may simply scan that user's rows
-- (exact results); the index mainly helps once the table holds many users' vectors.
drop index if exists ideas_embedding_idx;
create index if not exists ideas_embedding_hnsw_idx
  on ideas using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);

-- ─── Full-text over the plaintext columns ────────────────────────────────────
-- Content and summary are encrypted, so full-text can only cover title and tags.
alter table ideas add column if not exists title_tags_tsv tsvector
  generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || array_to_string(tags, ' '))) stored;
create index if not exists ideas_title_tags_tsv_idx on ideas using gin (title_tags_tsv);

-- ─── Semantic search (model-aware) ───────────────────────────────────────────
drop function if exists search_ideas(uuid, vector, int, double precision);
create or replace function search_ideas(
  p_user_id uuid,
  p_query_embedding vector(768),
  p_limit int default 10,
  p_threshold double precision default 0.3,
  p_model text default null
)
returns table(id uuid, similarity double precision)
language sql security invoker stable
as $$
  select i.id, (1 - (i.embedding <=> p_query_embedding))::double precision
  from ideas i
  where i.user_id = p_user_id
    and i.embedding is not null
    and (p_model is null or i.embedding_model = p_model)   -- never mix vectors from different models
    and (1 - (i.embedding <=> p_query_embedding)) > p_threshold
  order by i.embedding <=> p_query_embedding
  limit p_limit;
$$;

-- ─── Hybrid search: reciprocal rank fusion of vector rank and title/tag full-text rank ─────────────
create or replace function search_ideas_hybrid(
  p_user_id uuid,
  p_query_embedding vector(768),
  p_query_text text,
  p_limit int default 10,
  p_threshold double precision default 0.3,
  p_model text default null
)
returns table(id uuid, similarity double precision, text_match boolean, score double precision)
language sql security invoker stable
as $$
  with v as (
    select i.id, row_number() over (order by i.embedding <=> p_query_embedding) as r
    from ideas i
    where i.user_id = p_user_id and i.embedding is not null
      and (p_model is null or i.embedding_model = p_model)
      and (1 - (i.embedding <=> p_query_embedding)) > p_threshold
    order by i.embedding <=> p_query_embedding
    limit 50
  ),
  f as (
    select i.id, row_number() over (order by ts_rank_cd(i.title_tags_tsv, q.query) desc) as r
    from ideas i, (select websearch_to_tsquery('simple', p_query_text) as query) q
    where i.user_id = p_user_id and i.title_tags_tsv @@ q.query
    order by ts_rank_cd(i.title_tags_tsv, q.query) desc
    limit 50
  ),
  fused as (
    select coalesce(v.id, f.id) as id,
           (coalesce(1.0 / (60 + v.r), 0) + coalesce(1.0 / (60 + f.r), 0))::double precision as score,
           f.id is not null as text_match
    from v full join f on v.id = f.id
  )
  select fused.id,
         case when i.embedding is null then 0 else (1 - (i.embedding <=> p_query_embedding))::double precision end,
         fused.text_match,
         fused.score
  from fused join ideas i on i.id = fused.id
  order by fused.score desc
  limit p_limit;
$$;

-- ─── Pairwise similarities for the graph: top-k neighbours per idea, hard-capped ─────────────────
drop function if exists get_pairwise_similarities(uuid, double precision);
create or replace function get_pairwise_similarities(
  p_user_id uuid,
  p_threshold double precision default 0.3,
  p_model text default null,
  p_per_node int default 8,
  p_max_pairs int default 2000
)
returns table(id_a uuid, id_b uuid, similarity double precision)
language sql security invoker stable
as $$
  select least(a.id, n.id) as id_a, greatest(a.id, n.id) as id_b, max(n.sim)::double precision as similarity
  from ideas a
  cross join lateral (
    select b.id, 1 - (a.embedding <=> b.embedding) as sim
    from ideas b
    where b.user_id = p_user_id and b.id <> a.id and b.embedding is not null
      and (p_model is null or b.embedding_model = p_model)
    order by a.embedding <=> b.embedding
    limit p_per_node
  ) n
  where a.user_id = p_user_id and a.embedding is not null
    and (p_model is null or a.embedding_model = p_model)
    and n.sim > p_threshold
  group by least(a.id, n.id), greatest(a.id, n.id)
  order by max(n.sim) desc
  limit p_max_pairs;
$$;

-- ─── Embedding status (for stale-vector detection and selective re-embedding) ──────────────────
create or replace function embedding_status(p_model text)
returns table(total bigint, current bigint, stale bigint, missing bigint)
language sql security invoker stable
as $$
  select count(*),
         count(*) filter (where embedding is not null and embedding_model = p_model),
         count(*) filter (where embedding is not null and embedding_model is distinct from p_model),
         count(*) filter (where embedding is null)
  from ideas where user_id = auth.uid();
$$;

create or replace function ideas_needing_embedding(p_model text, p_limit int default 100)
returns table(id uuid)
language sql security invoker stable
as $$
  select id from ideas
  where user_id = auth.uid() and (embedding is null or embedding_model is distinct from p_model)
  order by created_at
  limit p_limit;
$$;
