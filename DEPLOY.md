# Deployment — DigitalOcean Droplet via GitHub Actions

Every push to `main` builds a Docker image, pushes it to GitHub Container
Registry (GHCR), and deploys it to your droplet over SSH. **You** provide the
secrets (to GitHub and the server) — they are never shared in chat or committed.

```
git push origin main
        │
        ▼
 GitHub Actions ──build──► GHCR (ghcr.io/you/repo)
        │
        └──ssh──► Droplet:  docker compose pull && up -d
                            ├─ app   (Next.js)
                            ├─ db    (Postgres 16, volume)
                            └─ caddy (auto-HTTPS reverse proxy)
```

## Your setup
| Thing | Value |
| --- | --- |
| GitHub repo | `mhcode17/prime` → `https://github.com/mhcode17/prime.git` |
| Docker image | `ghcr.io/mhcode17/prime:latest` (workflow builds this automatically) |
| Droplet IP | `142.93.9.208` (Ubuntu 22.04, NYC1) |
| Domain | `oneprimefleet.com` → point its A record to `142.93.9.208` |

The steps below are already filled in for these values.

## What you need
- A GitHub account + this project pushed to a GitHub repo.
- A DigitalOcean Droplet (Ubuntu 22.04/24.04), 2 GB RAM recommended.
- A domain name (for HTTPS) with an A record you can edit.

---

## 1. Put the code on GitHub
Git isn't installed on this machine — install **Git for Windows**
(https://git-scm.com/download/win) or **GitHub Desktop**, then:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
(`.env` is git-ignored, so your local secrets stay local.)

## 2. Create a deploy SSH key
On your machine (or any terminal):
```
ssh-keygen -t ed25519 -f deploy_key -N ""
```
- Add the **public** key to the droplet:
  `ssh-copy-id -i deploy_key.pub root@YOUR_DROPLET_IP`
  (or paste `deploy_key.pub` into `~/.ssh/authorized_keys` on the droplet).
- Keep the **private** key (`deploy_key`) for the next step. Delete it locally afterwards.

## 3. Add GitHub repository secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
| --- | --- |
| `DROPLET_HOST` | droplet public IP |
| `DROPLET_USER` | `root` (or your deploy user) |
| `DROPLET_SSH_KEY` | contents of the **private** `deploy_key` |
| `DROPLET_SSH_PORT` | *(optional)* SSH port, defaults to 22 |

GHCR auth uses the built-in `GITHUB_TOKEN` — nothing to configure.

## 4. Bootstrap the droplet (once)
```
ssh root@YOUR_DROPLET_IP 'bash -s' < deploy/setup-server.sh
```
Installs Docker + compose, opens ports 80/443, creates `/opt/trucking-crm`.

## 5. Create the server environment file
On the droplet, create `/opt/trucking-crm/.env` using
[`deploy/.env.server.example`](deploy/.env.server.example) as a template:
```
nano /opt/trucking-crm/.env
```
Set `APP_IMAGE` to `ghcr.io/<you>/<repo>:latest` (**lowercase**), a strong
`POSTGRES_PASSWORD` (matched inside `DATABASE_URL`), a random `AUTH_SECRET`
(`openssl rand -base64 48`), and your `DOMAIN` / `NEXT_PUBLIC_APP_URL`.

## 6. Point DNS at the droplet
Create an **A record** for your domain → droplet IP. Caddy will obtain a
Let's Encrypt certificate automatically on first request.

## 7. Deploy
```
git push origin main
```
Watch it in the repo's **Actions** tab. When green, the app is live at
`https://your-domain.com`. Health check: `https://your-domain.com/api/health`.

## 8. Create your admin login (once, no demo data)
```
ssh root@YOUR_DROPLET_IP
cd /opt/trucking-crm
docker compose -f docker-compose.prod.yml exec \
  -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='your-strong-pass' \
  app npx tsx prisma/create-admin.ts
```
(To instead load full demo data: `... app npx tsx prisma/seed.ts`.)

---

## Day-to-day
- **Deploy new changes:** just `git push origin main`.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f app`
- **Restart:** `docker compose -f docker-compose.prod.yml restart app`
- **Rollback:** on the droplet, set `APP_IMAGE=ghcr.io/<you>/<repo>:<old-sha>`
  in `.env`, then `docker compose -f docker-compose.prod.yml up -d`.
  (Every build is also tagged with its commit SHA.)
- **DB backup:**
  `docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres trucking_crm > backup_$(date +%F).sql`

## Notes & hardening
- The container runs `prisma db push` on start to sync the schema. For change
  history, adopt Prisma **migrations** later and switch the entrypoint to
  `prisma migrate deploy`.
- Signed PDFs are stored in Postgres as base64; consider object storage (Spaces/S3)
  as they grow.
- Consider a non-root deploy user and DigitalOcean's automated droplet backups.
