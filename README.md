# ALAG - Authentication Layer and Groups

ALAG is a full-stack authentication and social platform built with Astro,
TypeScript, Tailwind CSS, Node.js, Hono, MySQL, and Cloudflare R2. It
supports authentication and user management, a social feed, post
management, image storage, and administrative features — including email
OTP verification, WhatsApp OTP verification, JWT-based authentication,
Google Sign-In, password reset functionality, user dashboards, public feed
management, Cloudflare R2-backed image uploads, and admin tooling.

## Features

* JWT-based authentication
* Email OTP verification
* WhatsApp OTP verification (via UltraMsg)
* Google OAuth authentication
* Password reset via email
* User dashboard
* Public feed and post management (draft/publish)
* Like and save post functionality
* User profile and settings management
* Admin dashboard and user management
* MySQL database integration
* Auto-generated OpenAPI spec + Swagger UI
* Cloudflare R2 based image storage
* Secure image upload handling
* Automatic image URL generation
* Image deletion from R2 when posts are removed
* Profile image support
* Draft and publish post workflow
* Automatic alt text generation for uploaded images
* Request validation using Zod
* Rate limiting middleware
* API versioning support
* User session tracking and device information

## Tech Stack

### Frontend

* Astro
* TypeScript
* Tailwind CSS
* Axios
* Vite
* Astro Node adapter
* Server-side rendering (`output: server`)

### Backend

* Node.js
* Hono
* MySQL
* JSON Web Token (JWT)
* Nodemailer
* UltraMsg (WhatsApp OTP)
* Google Auth Library (Google Sign-In)
* Zod (request validation)
* AWS SDK S3 Client (`@aws-sdk/client-s3`) — Cloudflare R2 integration
* OpenAPI / Swagger (`@hono/zod-openapi`, Swagger UI)
* Hono middleware (rate limiting, auth guards, admin route protection)

## Project Structure

```text
alag/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── scripts/
│   │   └── stores/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── utils/
│   │   ├── middleware/
│   │   └── config/
│   ├── db/
│   │   ├── alag.sql
│   │   └── migrations/
│   │       ├── 001_add_post_draft_support.sql
│   │       ├── 002_add_mobile_otp_support.sql
│   │       └── 003_enforce_alt_text_not_null.sql
│   ├── seed.ts
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── cloudflare-worker/           # optional — used only for SMS OTP proxy if required
│
├── SETUP_GUIDE.md
└── README.md
```

## Prerequisites

* Node.js (v20.x recommended — matches the CI pipeline; v18+ likely works)
* npm
* MySQL (8.x recommended, 5.7+ compatible)
* A Cloudflare account with an R2 bucket created (for image upload support)

## Installation

Install dependencies for both backend and frontend:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Environment Variables

Create a `.env` file inside the `backend` directory by copying:

```bash
backend/.env.example
```

The backend `.env` covers:

* Database configuration (host, user, password, database name)
* JWT secret
* Gmail SMTP configuration (for email OTP and password reset)
* Google OAuth credentials
* UltraMsg credentials (WhatsApp OTP)
* Cloudflare R2 credentials (image upload/storage)

Configure all required environment variables before starting the application
— see [SETUP_GUIDE.md](./SETUP_GUIDE.md) for details on each variable,
including how to obtain Gmail, Google OAuth, and UltraMsg credentials.

Cloudflare R2 credentials required in the backend `.env`:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_URL=
```

`R2_PUBLIC_URL` is required for displaying uploaded images — it's the base
URL the frontend uses to render them. See
[backend/README.md](./backend/README.md) for where to obtain each of these
values from the Cloudflare dashboard.

For the frontend, create `.env` from `frontend/.env.example` and configure:

```env
PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

`PUBLIC_GOOGLE_CLIENT_ID` must exactly match the backend's `GOOGLE_CLIENT_ID`.
Never commit `.env` files in either `backend/` or `frontend/` — use the
corresponding `.env.example` as the reference template, and restart the
relevant service after changing any environment variable.

## Database Setup

Import the database schema (this creates the `alag` database itself, so no
separate `CREATE DATABASE` step is needed):

```bash
mysql -u root -p < backend/db/alag.sql
```

## Database Migration

Apply all migrations in `backend/db/migrations/`, in ascending numeric
order — each migration assumes the previous one has already run:

```bash
mysql -u root -p alag < backend/db/migrations/001_add_post_draft_support.sql
mysql -u root -p alag < backend/db/migrations/002_add_mobile_otp_support.sql
mysql -u root -p alag < backend/db/migrations/003_enforce_alt_text_not_null.sql
```

| Order | File | Purpose |
|-------|------|---------|
| 001 | `001_add_post_draft_support.sql` | Adds draft-state support to posts |
| 002 | `002_add_mobile_otp_support.sql` | Adds mobile/WhatsApp OTP verification support |
| 003 | `003_enforce_alt_text_not_null.sql` | Enforces `NOT NULL` on post image alt text |

There is no automated migration runner — apply new migration files manually,
in ascending numeric order, as they're added.

## Admin Seed

Create a default admin account:

```bash
cd backend
npm run seed
```

Safe to re-run — it skips creation if an admin with that email already
exists. Change the default password in any shared or production
environment.

## Running the Application

Open two terminals and run both services.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Backend URL:

```text
http://localhost:5001
```

API docs (Swagger UI):

```text
http://localhost:5001/api-docs
```

OpenAPI JSON:

```text
http://localhost:5001/api-docs/openapi.json
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:4321
```

The frontend dev/preview port is fixed (`strictPort: true`) — if `4321` is
already in use, the server will fail to start rather than switching
automatically. Make sure the backend is running before starting the
frontend, since most pages depend on live API calls.

## Available Scripts

### Backend

```bash
npm run dev
npm run build
npm start
npm run prod
npm run lint
npm run seed
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Important Notes

* Ensure MySQL is running before starting the backend.
* Copy `.env.example` to `.env` in both `backend/` and `frontend/` before
  running the application, and never commit either `.env` file.
* Import `backend/db/alag.sql` before applying migration files.
* Apply all migrations in numeric order, then run `npm run seed` to create
  the default admin account.
* Verify Email, Google OAuth, UltraMsg WhatsApp OTP, and Cloudflare R2
  credentials before testing authentication and image upload flows — see
  [SETUP_GUIDE.md](./SETUP_GUIDE.md).
* Keep `PUBLIC_GOOGLE_CLIENT_ID` (frontend) synchronized with
  `GOOGLE_CLIENT_ID` (backend) at all times.
* Restart the backend and/or frontend after changing any environment
  variable — values are read at process startup and are not hot-reloaded.
* Keep backend and frontend dependencies separate.

## Documentation

* [backend/README.md](./backend/README.md) — backend-specific setup,
  including Cloudflare R2 configuration and API documentation
* [frontend/README.md](./frontend/README.md) — frontend-specific setup
* [SETUP_GUIDE.md](./SETUP_GUIDE.md) — full setup guide, including Gmail
  SMTP, Google OAuth, UltraMsg WhatsApp OTP, and Cloudflare R2 configuration

## Application URLs

* Backend: `http://localhost:5001`
* Frontend: `http://localhost:4321`
* Swagger UI: `http://localhost:5001/api-docs`
* OpenAPI JSON: `http://localhost:5001/api-docs/openapi.json`