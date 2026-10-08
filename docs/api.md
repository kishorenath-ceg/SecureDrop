# API specification

This document will be expanded during later phases.

## Core endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/files/upload`
- `GET /api/files`
- `POST /api/share-links`
- `GET /api/share/:token`
- `POST /api/share/:token/download`
- `GET /api/dashboard/stats`

## Response envelope

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "This sharing link is invalid."
  }
}
```
