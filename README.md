# cardemon

Digital menus for restaurants. Restaurant owners sign up, build a menu with images, and share a public URL (`/m/<slug>`) for customers to view in-house.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Auth.js v5 (credentials provider, JWT sessions)
- Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- `@vercel/blob` for menu item image uploads

## Setup

1. **Install deps** (already done if you just scaffolded):
   ```bash
   npm install
   ```

2. **Provision a Postgres database.** Easiest options:
   - Local: install Postgres or run `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`
   - Hosted: [Neon](https://neon.tech), [Supabase](https://supabase.com), or any Postgres host

3. **Configure environment variables.** Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Then fill in:
   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `BLOB_READ_WRITE_TOKEN` — from Vercel dashboard → Storage → Blob → `.env.local`. Required only for image uploads; the app runs without it if you don't upload images.

4. **Run database migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open <http://localhost:3000>.

## Routes

- `/` — landing page
- `/signup` `/login` — restaurant owner auth
- `/dashboard` — onboarding (set restaurant name + slug) and menu management
- `/m/[slug]` — public menu (revalidated every 60s)

## Data model

`User` 1—n `Restaurant` 1—n `MenuCategory` 1—n `MenuItem`. Prices stored as integer cents (`priceCents`) to avoid float rounding.

## Notes

- The `middleware.ts` file produces a deprecation warning on Next 16 (renamed to `proxy.ts`). It still works; rename when convenient.
- Auth is split: `auth.config.ts` is the edge-safe slice used by middleware, `auth.ts` adds Prisma + bcrypt for the credentials provider.
- The Prisma client is generated to `src/generated/prisma` (gitignored). Run `npx prisma generate` after schema changes.
