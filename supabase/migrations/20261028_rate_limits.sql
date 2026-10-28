-- Durable per-user fixed-window rate limiting (works across serverless instances).
create table if not exists rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, bucket, window_start)
);
alter table rate_limits enable row level security;
-- No policies on purpose: clients cannot touch the table; only the security-definer function below can.

create or replace function check_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  if v_user is null then return false; end if;
  insert into rate_limits (user_id, bucket, window_start, count)
  values (v_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;
  -- opportunistic cleanup of old windows for this user
  delete from rate_limits where user_id = v_user and window_start < now() - interval '1 day';
  return v_count <= p_limit;
end;
$$;
revoke all on function check_rate_limit(text, int, int) from public, anon;
grant execute on function check_rate_limit(text, int, int) to authenticated;
