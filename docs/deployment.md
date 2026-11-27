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
