-- Defence in depth: the shared demo account (app_metadata.is_demo = true, settable only with the
-- service role) can never write, even if an API route forgets its guard. Restrictive policies are
-- AND-ed with the existing per-user policies; SELECT is left alone.
do $$
declare t text;
begin
  foreach t in array array['ideas', 'idea_versions', 'vault_meta', 'user_settings'] loop
    execute format('drop policy if exists "Demo user cannot insert" on %I', t);
    execute format('drop policy if exists "Demo user cannot update" on %I', t);
    execute format('drop policy if exists "Demo user cannot delete" on %I', t);
    execute format($p$create policy "Demo user cannot insert" on %I as restrictive for insert
      with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_demo')::boolean, false) = false)$p$, t);
    execute format($p$create policy "Demo user cannot update" on %I as restrictive for update
      using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_demo')::boolean, false) = false)$p$, t);
    execute format($p$create policy "Demo user cannot delete" on %I as restrictive for delete
      using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_demo')::boolean, false) = false)$p$, t);
  end loop;
end $$;
