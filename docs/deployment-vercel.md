# Vercel deployment

The app uses the Next.js Node runtime, PostgreSQL for durable content, member accounts, and image storage, and GitHub for source deployments.

## 1. Prepare your PostgreSQL database

You can use any managed PostgreSQL service (such as Neon, Railway, Supabase Postgres, AWS RDS, etc.).

Run the initialization script:
```bash
npm run db:init
```
Or execute `postgres/schema.sql` directly in your database SQL console. The tables will also be auto-initialized if they don't already exist.

## 2. Import the GitHub repository

In Vercel, choose **Add New → Project**, import your repository, and keep the repository root as the project root. Vercel detects Next.js; use Node.js 20 or 22. The build command is `npm run build` (or `pnpm run build`).

## 3. Add production environment variables

Add these in **Project Settings → Environment Variables** for Production (and Preview if needed):

| Variable | Value/source |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The production `https://…vercel.app` address after the first deployment |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname?sslmode=require`) |
| `ADMIN_PASSWORD` | A strong private admin password |
| `ADMIN_SESSION_SECRET` | A random secret with at least 32 characters |
| `GMAIL_USER` | Gmail account used to send event announcements (optional) |
| `GMAIL_APP_PASSWORD` | Gmail App Password (optional; keep private) |

Do not upload `.env.local` to GitHub or paste secret values into source files. The admin mail button remains unavailable until the two Gmail values are configured.

## 4. Image upload storage

The admin image API supports PNG, JPEG, GIF, WebP, BMP, TIFF, and AVIF. Images are stored securely as binary `BYTEA` data within PostgreSQL, providing atomic transactions and zero external storage dependencies. To stay below Vercel's serverless request limit, the current interface accepts up to 3 MB per image and 3.5 MB per upload request.
