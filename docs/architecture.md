# Architecture overview

This project is planned as a monorepo with a separate frontend, backend, and Supabase layer.

## Key decisions

- Frontend: React + TypeScript + Vite
- Backend: Fastify + TypeScript
- Database: Supabase PostgreSQL
- Storage: Supabase Storage private bucket
- Security: backend enforces auth, expiration, password checks, download limits, and signed URLs

## Request flow

1. Authenticated user uploads a file from the frontend.
2. Backend validates the file and stores metadata in Supabase.
3. Backend writes the file to a private object storage bucket.
4. Share link creation occurs entirely through backend logic.
5. Public recipients request the share route.
6. The backend checks the share token, expiration, password, and download count.
7. The backend generates a short-lived signed URL and returns a secure download response.

## Security boundary

The browser never receives object storage URLs for private files.
