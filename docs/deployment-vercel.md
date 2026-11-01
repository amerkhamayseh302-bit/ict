# Vercel deployment

The app uses the Next.js Node runtime, Supabase for durable content and image storage, and GitHub for source deployments.

## 1. Apply the Supabase migration

In Supabase, open **SQL Editor**, run `supabase/migrations/202611010001_hosting_storage.sql`, and confirm it completes. It creates private tables for site content, categories, community links, and media metadata, plus a private `ict-media` Storage bucket. The tables are accessible only to the server's service role.

The `event_subscriptions` table is defined by the earlier migration `202610250001_event_subscriptions.sql`. Run that too if it has not already been applied.

## 2. Import the GitHub repository

In Vercel, choose **Add New → Project**, import `amerkhamayseh302-bit/ict`, and keep the repository root as the project root. Vercel detects Next.js and the `pnpm-lock.yaml`; use Node.js 22. The build command is `pnpm run build` and the output setting stays on the framework default.

## 3. Add production environment variables

Add these in **Project Settings → Environment Variables** for Production (and Preview only if needed):

| Variable | Value/source |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The production `https://…vercel.app` address after the first deployment |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Supabase secret key; server-only, never prefix with `NEXT_PUBLIC_` |
| `ADMIN_PASSWORD` | A strong private admin password |
| `ADMIN_SESSION_SECRET` | A random secret with at least 32 characters |
| `GMAIL_USER` | Gmail account used to send event announcements (optional) |
| `GMAIL_APP_PASSWORD` | Gmail App Password (optional; keep private) |

Do not upload `.env.local` to GitHub or paste secret values into source files. The admin mail button remains unavailable until the two Gmail values are configured.

After adding variables, redeploy so the build and server receive them. For sign-in email links, add the Vercel production URL and `/api/auth/callback` to the Supabase Auth URL Configuration, and set the site's production URL as the redirect URL.

## 4. Image upload limit

The admin image API supports PNG, JPEG, GIF, WebP, BMP, TIFF, and AVIF. To stay below Vercel's serverless request limit, the current interface accepts up to 3 MB per image and 3.5 MB per upload request. Larger direct-to-Storage uploads can be added later with short-lived signed upload URLs.
