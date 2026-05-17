# Idea Vault — Setup Checklist

## 1. Extract & open

```bash
tar -xzf idea-vault-scaffold.tar.gz
cd idea-vault
code .
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Supabase

- [ ] Go to [supabase.com](https://supabase.com) and create a new project
- [ ] Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → click **Run**
- [ ] Go to **Project Settings → API** and copy:
  - `Project URL`
  - `anon public` key
  - `service_role` key (keep this secret)

---

## 4. Environment variables

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=         # Project URL from Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # anon public key
SUPABASE_SERVICE_ROLE_KEY=        # service_role key
ENCRYPTION_SECRET=                # generate below
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate your encryption secret:

```bash
openssl rand -base64 32
```

---

## 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 6. Configure your LLM provider

- [ ] Go to **Settings** in the app
- [ ] Choose your provider (Anthropic, OpenAI, Google, or Ollama)
- [ ] Enter your API key
- [ ] Select a model
- [ ] Click **Save settings**

> Your API key is encrypted with AES-256 before being stored — never stored in plaintext.

---

## 7. Capture your first idea

- [ ] Go to **Dashboard**
- [ ] Type a raw thought in the capture box
- [ ] Press **⌘↵** or click **Capture →**
- [ ] Watch the AI structure it and surface connections

---

## 8. Deploy to VPS (optional)

- [ ] Install Docker + Docker Compose on your VPS
- [ ] Point your domain DNS to the VPS IP
- [ ] Get an SSL certificate:
  ```bash
  certbot certonly --standalone -d yourdomain.com
  ```
- [ ] Update `nginx.conf` — replace `your-domain.com` with your actual domain
- [ ] Copy the project to the VPS and create `.env.local` with production values
- [ ] Build and start:
  ```bash
  docker-compose up -d --build
  ```
- [ ] Check logs:
  ```bash
  docker-compose logs -f app
  ```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank page after login | Check Supabase URL and anon key in `.env.local` |
| "No LLM configured" error | Go to Settings and save your provider + API key |
| Capture fails | Check your API key is valid and has credits |
| Graph is empty | Capture at least one idea first |
| Auth redirect loop | Make sure `NEXT_PUBLIC_APP_URL` matches your actual URL |
