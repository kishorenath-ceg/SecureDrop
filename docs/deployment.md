# Deployment guidance

This document will be expanded later with Cloudflare, Supabase, and production deployment steps.

## Production goals

- HTTPS through Cloudflare
- Private file storage only
- Protected backend API
- Signed URL flow for downloads
- Rate limiting and WAF protections
- Supabase managed database and storage

## Secure share links

Set these Render environment variables so shared links use the deployed site and downloads use the deployed API:

- `APP_URL=https://securedrop.kishorenath.me`
- `API_URL=https://securedrop-backend-9p6w.onrender.com`

In Vercel, set `VITE_API_URL=https://securedrop-backend-9p6w.onrender.com`. Share URLs use the user-provided link name, for example `https://securedrop.kishorenath.me/SecureDrop/team-transfer`.

Share links and uploaded files must use persistent Supabase storage in production. Apply every SQL migration in `supabase/migrations/` to the production Supabase project, including `006_persistent_share_links.sql`, and configure `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` on the backend. Production now refuses to start without these settings rather than silently accepting uploads into temporary memory.

Uploads have no automatic 30-day deletion: they remain in the private Supabase Storage bucket and database until the owner deletes them. Share links created without an expiration also remain active until revoked or until their file is manually deleted. Do not configure a Supabase Storage lifecycle rule or external cleanup job to delete these objects. After deploying, check `https://securedrop-backend-9p6w.onrender.com/health`; `data.storageMode` must be `persistent`. If it reports `in-memory`, the running backend is not configured for durable storage.

Files or links uploaded while the backend was using in-memory storage cannot be recovered after its process restarted. Re-upload those files and create new links after confirming persistent storage is active.

## Homepage SEO deployment

The frontend build prerenders the public landing page into `frontend/dist/index.html`. Keep the prerender step in the frontend build script so search crawlers can read the homepage content without waiting for client-side rendering. The sitemap intentionally lists only the homepage; add routes only when they are public and intended for indexing.

For Vercel, deploy the frontend project with `frontend` as its root directory and use `npm run build` with `dist` as the output directory. After deployment, verify `https://securedrop.kishorenath.me/`, `/robots.txt`, and `/sitemap.xml`; the sitemap should list only `https://securedrop.kishorenath.me/`.

## Authentication CAPTCHA

Set `VITE_TURNSTILE_SITE_KEY` in `frontend/.env.local` for local development and in the Vercel frontend environment for production. The site key is public; never put the Turnstile secret key in a `VITE_` variable or frontend file.

The login, registration, and password-reset flows send the Turnstile token directly to Supabase Auth. Keep Cloudflare Turnstile CAPTCHA configured in Supabase Auth with the widget's secret key. The backend currently has no custom login, registration, or password-reset endpoints, so it does not need a separate Siteverify request for these flows.

For local testing, allow `localhost` in the Turnstile widget configuration, set the site key in `frontend/.env.local`, and restart Vite. Verify that each auth form stays disabled until the challenge succeeds, that expired or failed challenges require another verification, and that each submission is accepted or rejected by Supabase Auth. For production, set the same widget's site key in Vercel and ensure the production hostname is allowed by the widget.

## Upstash Redis

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` only in the backend environment (for example, Render or `backend/.env`). These credentials must never be exposed to the Vite frontend. Redis is optional: if it is unconfigured or unavailable, cache operations fall back to Supabase and the existing in-process global rate limit remains active.

The backend caches authenticated dashboard statistics for 30 seconds and per-user file metadata for 45 seconds. Public share lookup caching stores only a hashed-key lookup hint from the public identifier to the share-record ID for 15 seconds; every use fetches the current share record from Supabase before checking expiry, password protection, revocation, or download limits. File buffers, passwords, password hashes, sessions, and access/refresh tokens are not cached.

Redis-backed sliding-window limits are 120 requests/minute for `/api/auth/session`, 20 share creations/minute per authenticated user, 8 password-verification attempts/minute per share, and 30 public download attempts/minute per share. The existing global in-process limit also remains active. Signup and login are performed directly through Supabase Auth, so they have no backend endpoints to rate-limit; keep Supabase Auth's own protections enabled. The backend has no file-update endpoint; successful uploads and deletes invalidate the affected user's file-list and dashboard caches.
