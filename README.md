# Trucking CRM

An all-in-one CRM for trucking carriers with three portals — **Admin**, **Company**, and **Driver**.

## Features

- **Auth & roles** — email/password auth with three roles (admin, company, driver), JWT session cookies, route protection via middleware.
- **Registration** — companies self-register (pending admin approval); drivers register and apply to an active company.
- **Admin** — approve/suspend companies, manage all users.
- **Drivers** — `All / Pending / Terminated` lists, full driver profile with hiring status workflow (Pending → Active → Terminated) and editable info.
- **E-sign documents** (DocuSign-style) — company creates documents (typed text or uploaded PDF), then **places fields on the PDF** (drag & drop): signature boxes, plus auto-fill fields (full name, DOB, license #/state, address, phone, email, date signed) that pull from each driver's profile, and free-text fields. Drivers open the PDF, sign exactly in the placed boxes, and auto-fill fields populate automatically. On completion the app **generates a flattened signed PDF** with a **Certificate of Completion** page (envelope ID, audit trail, signer IP, SHA-256 integrity hash). Company/admin/driver can **download the signed PDF**; the company sees an in-app certificate page too.
- **Screening** — order PSP / MVR reports via a **mock Samba Safety** provider; violations & results stored and displayed.
- **Drug tests** — order DOT drug tests, schedule, and record negative/positive results.
- **FMCSA Clearinghouse** — submit pre-employment / limited / annual queries via a **mock** provider.
- **Orientation appointments** — company publishes open calendar slots (drivers self-book) or assigns a date directly to a driver.
- **Equipment** — manage trucks & trailers, assign/unassign them to drivers.
- **Messaging** — real-time-style chat between company and driver, with unread counts.

## Tech stack

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS** + lucide-react icons
- **PostgreSQL** + **Prisma ORM**
- Custom auth (bcrypt + `jose` JWT in httpOnly cookie)

## Third-party integrations

Screening providers are **mocked behind a clean interface** (`src/lib/integrations/`).
To go live, swap `sambaProvider` / `clearinghouseProvider` in those files for real
API clients implementing the `ScreeningProvider` / `ClearinghouseProvider` interfaces —
no call sites change.

## Getting started

```bash
# 1. Start PostgreSQL (Docker)
docker compose up -d

# 2. Install deps
npm install

# 3. Apply schema + generate client
npm run db:push

# 4. Seed demo data
npm run db:seed

# 5. Run
npm run dev        # http://localhost:3000
```

### Demo logins (password: `password123`)

| Role    | Email                      |
| ------- | -------------------------- |
| Admin   | admin@truckingcrm.com      |
| Company | manager@acmefreight.com    |
| Driver  | carlos.driver@example.com  |

## Useful scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build & serve
- `npm run db:studio` — Prisma Studio (browse the DB)
- `npm run db:migrate` — create a migration (instead of `db:push`)

## Notes

- `.env` holds `DATABASE_URL` and `AUTH_SECRET` — change `AUTH_SECRET` before deploying.
- Uploaded documents are stored inline (base64) for simplicity; move to object
  storage (S3/GCS) for production.
