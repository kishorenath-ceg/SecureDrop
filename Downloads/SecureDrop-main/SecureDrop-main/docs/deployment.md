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
