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

Share links and uploaded files must use persistent Supabase storage in production. Apply every SQL migration in `supabase/migrations/` to the production Supabase project, including `006_persistent_share_links.sql`, and configure `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` on the backend. Without these settings, the backend uses in-memory storage, and uploads and share links will be lost when the backend restarts.
