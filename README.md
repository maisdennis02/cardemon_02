# menulala

Digital menus for restaurants. Owners sign up, upload their menu artwork as ordered images, and share a public URL (`/m/<slug>`) where customers swipe through the menu via a Swiper.js cube animation. Floating WhatsApp button on the public page if a number is configured.

🌐 **Live:** <https://menulala.com>

The design replicates the example in `example/` (a static-HTML version of the same idea).

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Auth.js v5 (credentials provider, JWT sessions)
- Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- `@vercel/blob` for menu image uploads (browser → Blob direct uploads)
- `swiper` for the public-page cube slideshow
- `@dnd-kit` for drag-and-drop image reordering on the dashboard
- `qrcode.react` for the menu QR code

## Setup

1. **Install deps:**
   ```bash
   npm install
   ```
   (Triggers `prisma generate` via the `postinstall` hook so `src/generated/prisma` is populated.)

2. **Provision a Postgres database.** [Neon](https://neon.tech) free tier works well; local Postgres also fine.

3. **Configure environment variables.** Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — Postgres connection string (Neon: `?sslmode=verify-full`)
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `BLOB_READ_WRITE_TOKEN` — Vercel dashboard → Storage → Blob. Required for image upload.

4. **Sync the schema:**
   ```bash
   npx prisma db push
   ```
   (Use `prisma migrate dev` once you start tracking real migration history.)

5. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## Deploy to Vercel

The app deploys cleanly on Vercel with the GitHub integration:

1. Import the repo at <https://vercel.com/new>.
2. Add env vars: `DATABASE_URL`, `AUTH_SECRET` (don't paste `BLOB_READ_WRITE_TOKEN` — connect the store instead).
3. After the first deploy, go to **Storage** → **Connect Store** and pick your Blob store. Vercel auto-injects `BLOB_READ_WRITE_TOKEN` and triggers a redeploy.
4. The `postinstall` script (`prisma generate`) ensures the generated client is built on every fresh install.

Auth.js v5 auto-detects the production URL via Vercel's env vars — no `AUTH_URL` needed.

## Routes

- `/` — landing page (hero, phone-frame preview, three-step features)
- `/signup` `/login` — owner auth
- `/dashboard` — restaurant settings + QR code + drag-and-drop image manager
- `/m/[slug]` — public Swiper cube slideshow (revalidated every 60s)
- `/api/blob/upload` — token-issuing route for browser-to-Blob direct uploads
- `/api/auth/[...nextauth]` — Auth.js handlers

## Data model

`User` 1—n `Restaurant` 1—n `MenuImage` (with `sortOrder`). `Restaurant.whatsappNumber` is optional digits-only (e.g. `5513996332974`).

## Notes

- Auth is split: `auth.config.ts` is the edge-safe slice used by `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`); `auth.ts` adds Prisma + bcrypt for the credentials provider.
- The Prisma client is generated to `src/generated/prisma` (gitignored). Run `npx prisma generate` after schema changes (or `npm install`, which triggers it via `postinstall`).
- Image uploads bypass Next.js Server Actions' 1 MB body limit by going browser → Vercel Blob directly. The server route at `/api/blob/upload` only mints signed tokens; bytes never pass through it.
- Public menu page uses plain `<img>` (not `next/image`) inside Swiper slides — Swiper's 3D transforms work better without next/image's responsive layout. Vercel Blob already serves over CDN.
- `example/` contains the static-HTML reference design that the public page was modeled after.
