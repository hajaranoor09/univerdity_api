# University API Access Management System (FSD Lab 07)

Node.js + Express + MySQL + AJAX (fetch).

## Setup

1. Install MySQL and run the schema (creates DB `university_api` with sample data):
   ```
   mysql -u root -p < schema.sql
   ```
2. Install and start:
   ```
   npm install
   npm start
   ```
   Optional environment variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, `ADMIN_API_KEY`.
3. Open http://localhost:3000

## Pages

| URL | Purpose |
|---|---|
| `/admin` | Admin panel. Admin key: `admin-master-key-2026` |
| `/settings` | Students/teachers enter and save their API key |
| `/student` | Student's own info and marks |
| `/teacher` | All students and all marks |

## Demo keys (from schema.sql)

| Key | Owner | Limit |
|---|---|---|
| `stu-ali-key-1111` | Student Ali Khan (id 1) | 20 |
| `stu-sara-key-2222` | Student Sara Ahmed (id 2) | 50 |
| `tch-fahad-key-3333` | Teacher M. Fahad Qasim (id 1) | 100 |

## API (key always sent in the `x-api-key` header)

Admin (admin key only):

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/students` | List students |
| GET | `/api/admin/teachers` | List teachers |
| GET | `/api/admin/keys` | Keys with usage and status |
| GET | `/api/admin/keys/:id/usage` | Request log of one key |
| POST | `/api/admin/keys` | Generate key `{owner_type, owner_id, request_limit}` |
| PUT | `/api/admin/keys/:id/limit` | Update limit `{request_limit}` |
| PUT | `/api/admin/keys/:id/revoke` | Revoke key |

Student / teacher (issued keys):

| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/me` | Student, teacher |
| GET | `/api/students` | Teacher only |
| GET | `/api/students/:id` | Student (own id only), teacher |
| GET | `/api/students/:id/marks` | Student (own id only), teacher |
| GET | `/api/marks` | Teacher only |

Status codes: 200/201 success, 400 bad input, 401 missing/invalid key, 403 revoked key or forbidden,
404 not found, 409 duplicate active key, 429 limit exceeded, 500 server error.

## Quick tests (curl)

```
curl -H "x-api-key: stu-ali-key-1111" localhost:3000/api/students/1/marks   # 200
curl -H "x-api-key: stu-ali-key-1111" localhost:3000/api/students/2/marks   # 403 (other student)
curl -H "x-api-key: stu-ali-key-1111" localhost:3000/api/marks              # 403 (teacher only)
curl localhost:3000/api/me                                                   # 401 (no key)
curl -H "x-api-key: admin-master-key-2026" localhost:3000/api/admin/keys    # 200
curl -H "x-api-key: stu-ali-key-1111" localhost:3000/api/admin/keys         # 403 (not admin)
```
To show the 429: set a key's limit to 3 in `/admin`, then refresh the student page until it blocks.

## Security notes

- A student's id comes from the API key, never from the client, so changing the URL cannot expose another record.
- Request counting is a single atomic SQL `UPDATE ... WHERE requests_used < request_limit`.
- All SQL uses parameterised queries; the admin key is compared in constant time.

## Submission checklist

PDF with screenshots (admin panel, key generation, settings page, student page, teacher page, 403/429 errors)
and code excerpts (`schema.sql`, `middleware/auth.js`, `routes/*.js`, a frontend file), plus a short screen-recorded demo video.
