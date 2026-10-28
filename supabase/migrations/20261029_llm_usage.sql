-- Per-request log of model calls for the usage summary in Settings. Contains no prompt or note content.
create table if not exists llm_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,               -- capture | embedding | search | overview
  provider text not null,
  model text not null,
  latency_ms int not null,
  input_tokens int,
  output_tokens int,
  success boolean not null,
  error text,                       -- short message only
  created_at timestamptz not null default now()
);
create index if not exists llm_usage_user_created_idx on llm_usage (user_id, created_at desc);
alter table llm_usage enable row level security;
create policy "Users can read own usage" on llm_usage for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on llm_usage for insert with check (auth.uid() = user_id);

create or replace function usage_summary(p_days int default 30)
returns table(kind text, provider text, model text, calls bigint, failures bigint,
              avg_latency_ms double precision, input_tokens bigint, output_tokens bigint)
language sql security invoker stable
as $$
  select kind, provider, model, count(*),
         count(*) filter (where not success),
         avg(latency_ms)::double precision,
         coalesce(sum(input_tokens), 0)::bigint,
         coalesce(sum(output_tokens), 0)::bigint
  from llm_usage
  where user_id = auth.uid() and created_at > now() - make_interval(days => p_days)
  group by kind, provider, model
  order by count(*) desc;
$$;
