# Deploying to Vercel

Vercel is the primary deployment path. `Dockerfile`, `docker-compose.yml` and `nginx.conf` remain for self-hosting.

## 1. Supabase

1. Create a project and run, in order, in the SQL editor: `supabase/schema.sql`, then every file in
   `supabase/migrations/` (oldest first).
2. **Authentication → URL Configuration**
   - *Site URL*: your production URL (e.g. `https://idea-vault.vercel.app`)
   - *Redirect URLs*: `https://idea-vault.vercel.app/auth/callback` and, for previews,
     `https://*-<your-team>.vercel.app/auth/callback`
3. Note the project's **region** (Project Settings → General).

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | anon key (safe for the browser; protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Bypasses RLS. Only used by the demo sign-in route and scripts. Mark as sensitive |
| `ENCRYPTION_SECRET` | server only | 32+ random chars (`openssl rand -base64 32`). Losing or changing it makes stored data unreadable |
| `NEXT_PUBLIC_APP_URL` | all | Public URL of the deployment |
| `DEMO_USER_ID` | server only | Optional; enables "Try the demo". Printed by `npm run seed:demo` |

Do not set `ALLOW_PRIVATE_LLM_URLS` on Vercel.

## 3. Region

Set **Project → Settings → Functions → Function Region** to the Vercel region nearest your Supabase
region (e.g. Supabase `us-east-1` → Vercel `iad1`; `eu-central-1` → `fra1`). Every request makes several
Supabase round trips, so co-locating them matters more than being close to the user.

## 4. Function limits

`maxDuration` is set per route: capture 60 s, search 30 s, overview 60 s, backfill 300 s. Check your plan's maximum.

## 5. Demo vault (optional)

```bash
npm run seed:demo      # needs SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_SECRET, DEMO_USER_EMAIL, SEED_EMBEDDINGS_*
```
Copy the printed `DEMO_USER_ID` into Vercel. The demo account is read-only (route guards plus RLS) and has no
password; the server signs visitors in with a one-time token.

## 6. Existing data from the CryptoJS era

```bash
npm run migrate:encryption -- --dry-run
npm run migrate:encryption
```
Legacy rows stay readable until migrated.

## 7. `proxy.ts`

Next.js 16 `proxy.ts` (formerly middleware) runs on the Node.js runtime and is supported on Vercel. After the
first deploy, confirm that opening `/dashboard` while signed out redirects to `/auth/login`.
