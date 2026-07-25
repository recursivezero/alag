# alag — Project Setup & Handover Guide

This document is the single source of truth for getting the **alag** project running
from a clean machine. It is written for a new developer or intern picking up the
project with no prior context.

> **Note on naming:** the repository/package is named `alag` ("Authentication Layer
> and Groups"). Some internal strings, email templates, and the original README still
> reference an earlier project name, `RecursiveAuth` — this is cosmetic and does not
> affect functionality.

---

# Project Overview

## Purpose

alag is a full-stack authentication and social image-sharing platform. It supports:

- Email + password registration with **email OTP verification**
- **WhatsApp OTP** verification (via UltraMsg)
- **Google Sign-In** (OAuth)
- JWT-based session authentication (cookie-based)
- Password reset via email
- A user dashboard with a public feed, post creation (drafts + publish), likes, and saves
- An admin dashboard for user and content management

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Astro + TypeScript, Tailwind CSS, Axios |
| Backend    | Node.js + Hono (TypeScript), `@hono/zod-openapi` |
| Database   | MySQL (via `mysql2`, connection pooling) |
| Auth       | JWT (`jsonwebtoken`), bcrypt password hashing, Google OAuth (`google-auth-library`) |
| Email      | Nodemailer (Gmail SMTP) |
| WhatsApp   | UltraMsg API |
| API docs   | Swagger UI, auto-generated OpenAPI spec |
| Optional   | Cloudflare Worker proxy for SMS OTP delivery (`cloudflare-worker/`) |

## Folder Structure

```text
alag/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handler logic (auth, admin, posts)
│   │   ├── routes/          # Hono route definitions (/api/v1/...)
│   │   ├── middleware/      # Auth guards, rate limiting, etc.
│   │   ├── schemas/         # Zod request/response schemas
│   │   ├── config/          # db.ts (MySQL pool)
│   │   ├── utils/           # mailer.ts, whatsapp.ts, sms.ts, jwt.ts, hash.ts, etc.
│   │   ├── docs/            # OpenAPI generation
│   │   └── index.ts         # App entrypoint
│   ├── db/
│   │   ├── alag.sql         # Full schema (run this first)
│   │   └── migrations/      # Incremental migrations, run in numeric order
│   ├── seed.ts               # Creates a default admin user
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Astro pages (incl. admin/, auth/, posts/, api/)
│   │   ├── components/       # UI, auth, posts, admin, layout components
│   │   ├── services/         # API client calls (Axios)
│   │   ├── stores/           # Client-side state
│   │   └── layouts/
│   ├── .env.example
│   └── package.json
│
├── cloudflare-worker/        # Optional SMS proxy worker
└── package.json               # Repo-level metadata only (not a build entrypoint)
```

---

# Prerequisites

Install the following before starting:

- **Node.js** — v20.x recommended (matches the CI pipeline). v18+ should also work.
- **npm** — bundled with Node.js
- **MySQL** — 8.x recommended (any MySQL 5.7+/8.x compatible server works)
- **Git**

Verify versions:

```bash
node -v
npm -v
mysql --version
git --version
```

---

# Backend Setup

All commands below are run from the `backend/` directory unless noted.

## 1. Install dependencies

```bash
cd backend
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `backend/.env` and fill in real values. See the [Environment Variables](#environment-variables)
section below for what each variable means, and the dedicated setup sections for
Email, Google, and WhatsApp for how to obtain each credential.

## 3. Create the database

See [Database Setup](#database-setup) below — do this before starting the backend.

## 4. Run migrations

See [Database Setup](#database-setup) — migration files live in `backend/db/migrations/`.

## 5. Seed an admin user

```bash
npm run seed
```

This creates a default admin account using `DEFAULT_ADMIN_EMAIL` /
`DEFAULT_ADMIN_PASSWORD` from `.env` if set, otherwise falls back to
`admin@gmail.com` / `Admin@1234`. **Change these defaults before/after seeding
in any shared or production environment.**

## 6. Run the backend

```bash
npm run dev
```

The backend starts on `http://localhost:5001` by default (configurable via `PORT`).

Other useful scripts:

```bash
npm run build   # compile TypeScript to dist/
npm start        # run compiled build (dist/index.js)
npm run prod     # build + run with NODE_ENV=production
npm run lint      # run ESLint
```

Once running, interactive API docs are available at:

```text
http://localhost:5001/api-docs
```

---

# Frontend Setup

Run from the `frontend/` directory.

## 1. Install dependencies

```bash
cd frontend
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Set:

```env
PUBLIC_API_BASE_URL=http://localhost:5001/api
PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

(`PUBLIC_GOOGLE_CLIENT_ID` must match the `GOOGLE_CLIENT_ID` used on the backend —
see [Google Login Setup](#google-login-setup).)

## 3. Run the frontend

```bash
npm run dev
```

The frontend starts on `http://localhost:4321` by default.

Other scripts:

```bash
npm run build     # production build
npm run preview    # preview a production build locally
```

---

# Database Setup

## 1. Create the database and import the schema

The full schema (including database creation) lives in `backend/db/alag.sql`:

```bash
mysql -u root -p < backend/db/alag.sql
```

This creates the `alag` database and all base tables (`users`, `user_sessions`,
`admins`, posts, etc.).

## 2. Run migrations, in order

Migrations live in `backend/db/migrations/` and must be applied **in numeric order**:

```bash
mysql -u root -p alag < backend/db/migrations/001_add_post_draft_support.sql
mysql -u root -p alag < backend/db/migrations/002_add_mobile_otp_support.sql
mysql -u root -p alag < backend/db/migrations/003_enforce_alt_text_not_null.sql
```

> If additional migration files are added later, keep applying them in ascending
> numeric order. There is currently no automated migration runner — this is a
> manual step.

## 3. Seed data

From `backend/`:

```bash
npm run seed
```

This inserts a default admin account (see [Backend Setup](#backend-setup) step 5).
The script is idempotent — it skips creation if an admin with the same email
already exists.

---

# Email OTP Setup

Email OTP delivery uses **Nodemailer over Gmail SMTP**. To configure it:

1. **Use (or create) a Gmail account** that will send OTP and password-reset emails.
   For anything beyond local development, use a dedicated account rather than a
   personal one.

2. **Enable 2-Step Verification** on that Gmail account:
   Google Account → Security → 2-Step Verification → follow the setup flow.
   App Passwords cannot be generated until this is turned on.

3. **Generate a Gmail App Password:**
   Google Account → Security → 2-Step Verification → App passwords → create a new
   app password (choose "Mail" / "Other" as the app type). Google will generate a
   16-character password — copy it immediately, it's only shown once.

4. **Configure `EMAIL_USER`** in `backend/.env`:
   ```env
   EMAIL_USER=your.address@gmail.com
   ```

5. **Configure `EMAIL_PASSWORD`** in `backend/.env` using the **App Password**
   generated in step 3 — **not** your normal Gmail login password:
   ```env
   EMAIL_PASSWORD=your16charapppassword
   ```

6. **SMTP configuration** — already set with sensible Gmail defaults in
   `.env.example`, no changes usually needed:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=465
   EMAIL_SECURE=true
   ```

7. Restart the backend after changing any of these values.

---

# Google Login Setup

Google Sign-In is implemented with `google-auth-library` on the backend and
Google Identity Services on the frontend.

1. **Go to Google Cloud Console:** https://console.cloud.google.com/
   Create a new project (or select an existing one).

2. **Create an OAuth Client:**
   APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Application type: **Web application**.

3. **Authorized JavaScript origins** — add your frontend URL(s):
   ```text
   http://localhost:4321
   ```

4. **Authorized redirect URIs** — Google Identity Services' one-tap/button flow
   used here doesn't require a server-side redirect URI for the basic sign-in
   flow, but if prompted, add:
   ```text
   http://localhost:4321
   ```
   Add your production frontend URL as well once deployed.

5. **Copy the generated Client ID** and set it in **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID`
   - `frontend/.env` → `PUBLIC_GOOGLE_CLIENT_ID`

   Both must be the same value — the backend verifies the token's audience
   against `GOOGLE_CLIENT_ID`.

6. **Testing:**
   - Restart both frontend and backend after setting the client ID.
   - Open the frontend, go to the login/register page, and use the Google
     Sign-In button.
   - If it fails silently, check the browser console for an origin mismatch
     error — the origin must exactly match what's registered in step 3
     (including port).

---

# WhatsApp OTP Setup (UltraMsg)

WhatsApp OTP delivery uses the [UltraMsg](https://ultramsg.com/) API
(`backend/src/utils/whatsapp.ts`). To configure it:

1. **Create an UltraMsg account** at https://ultramsg.com/ (free tier available
   for testing).

2. **Create an Instance** from the UltraMsg dashboard — this represents a single
   WhatsApp connection.

3. **Scan the QR Code** shown in the instance dashboard using WhatsApp on a phone
   (WhatsApp → Linked Devices → Link a Device). This links that WhatsApp number
   to the UltraMsg instance.

4. **Wait until the instance status shows "Connected"** in the dashboard before
   testing — messages will fail or queue if the instance isn't connected.

5. **Copy the Instance ID** from the dashboard (shown on the instance overview
   page).

6. **Copy the Token** (API token) for that instance, also shown on the instance
   overview/settings page.

7. **Configure `backend/.env`:**
   ```env
   ULTRAMSG_INSTANCE_ID=your_instance_id
   ULTRAMSG_TOKEN=your_token
   ```

8. **Restart the backend** so the new environment variables are picked up.

9. **Test WhatsApp OTP** by registering/logging in with a mobile number flow in
   the app and confirming the OTP arrives via WhatsApp on the linked number.

   Notes on current behavior (`whatsapp.ts`):
   - In development, if `ULTRAMSG_INSTANCE_ID`/`ULTRAMSG_TOKEN` are missing, the
     app **skips sending and treats it as success** (a warning is logged) — this
     lets you develop without a live UltraMsg account.
   - In production (`NODE_ENV=production`), missing credentials will cause
     WhatsApp OTP sends to **fail** (logged as an error) rather than silently
     succeed.

---

# Environment Variables

A complete, secrets-free template is provided at **`backend/.env.example`**
(included alongside this document). Copy it to `backend/.env` and fill in real
values — never commit the real `.env` file.

```env
PORT=5001

FRONTEND_URL=http://localhost:4321
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax

DB_HOST=localhost
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=alag

JWT_SECRET=YOUR_RANDOM_SECRET

EMAIL_USER=YOUR_GMAIL_ADDRESS
EMAIL_PASSWORD=YOUR_GMAIL_APP_PASSWORD
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

SMS_WORKER_URL=https://YOUR_WORKER_SUBDOMAIN.workers.dev {optional}
SMS_WORKER_SECRET=YOUR_RANDOM_SHARED_SECRET. {optional}

ULTRAMSG_INSTANCE_ID=YOUR_ULTRAMSG_INSTANCE_ID
ULTRAMSG_TOKEN=YOUR_ULTRAMSG_TOKEN
```

The frontend also needs its own `.env` (`frontend/.env`, copied from
`frontend/.env.example`):

```env
PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

> ⚠️ **Action item for the current maintainer:** the `backend/.env.example`
> file currently checked into the repository contains what appear to be **real,
> working UltraMsg credentials** (an instance ID and token) rather than
> placeholders. This is a live secret leak. Rotate that UltraMsg token
> immediately (regenerate it from the UltraMsg dashboard) and replace
> `backend/.env.example` in the repository with the placeholder-only version
> provided alongside this document.

---

# Running the Project

Run backend and frontend in two separate terminals.

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
```
→ http://localhost:5001 (API docs at `/api-docs`)

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```
→ http://localhost:4321

Make sure MySQL is running and the database/migrations/seed steps above are
complete before starting the backend.

---

# Testing Checklist

Use this checklist to verify a new environment is fully working:

- [ ] **Email Registration** — register with a new email; account is created
- [ ] **Email OTP** — OTP email arrives in inbox (check spam folder too) and
      verifies successfully
- [ ] **WhatsApp OTP** — OTP arrives via WhatsApp on the linked UltraMsg number
- [ ] **Google Login** — Google Sign-In button logs in/registers successfully
- [ ] **Login** — existing user can log in with email + password
- [ ] **Forgot Password** — reset email arrives, reset link works, new password
      logs in successfully
- [ ] **Admin Login** — seeded admin account can log in
- [ ] **Admin Dashboard** — admin dashboard loads and shows user/content data

---

# Troubleshooting

**Gmail OTP not sending**
- Confirm 2-Step Verification is enabled and you're using an **App Password**,
  not the regular Gmail password, in `EMAIL_PASSWORD`.
- Check backend logs for `[EMAIL] Error sending OTP` — the underlying
  Nodemailer/SMTP error is logged there.
- Confirm `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_SECURE` match Gmail's SMTP settings
  (`smtp.gmail.com`, `465`, `true`).
- Check the sending Gmail account isn't rate-limited or flagged for suspicious
  activity.

**WhatsApp OTP not sending**
- Confirm the UltraMsg instance status is **Connected** in the dashboard.
- Double-check `ULTRAMSG_INSTANCE_ID` and `ULTRAMSG_TOKEN` in `backend/.env`.
- In dev mode without credentials configured, OTP sending is silently skipped
  (treated as success) — this is expected, not a bug.
- In production, missing credentials cause a hard failure — check backend logs
  for `[WhatsApp] ULTRAMSG_INSTANCE_ID / ULTRAMSG_TOKEN is not set in production`.
- Check backend logs for `[WhatsApp] UltraMsg API returned an error` for the
  specific API error returned by UltraMsg.

**UltraMsg not connected**
- Re-scan the QR code from the UltraMsg dashboard (WhatsApp → Linked Devices).
- WhatsApp sessions can disconnect if the linked phone is offline for an
  extended period, or if the device was unlinked manually.

**Google Login not working**
- Verify `GOOGLE_CLIENT_ID` (backend) and `PUBLIC_GOOGLE_CLIENT_ID` (frontend)
  are identical.
- Verify the frontend's exact origin (protocol + host + port) is listed under
  Authorized JavaScript origins in Google Cloud Console.
- Check the browser console for an `origin_mismatch` or `invalid_client` error.

**Database connection issues**
- Confirm MySQL is running and reachable at `DB_HOST`.
- Confirm `DB_USER`/`DB_PASSWORD` have access to the `DB_NAME` database.
- Confirm `backend/db/alag.sql` was imported before starting the backend.
- Check backend startup logs for a `mysql2` connection error (wrong
  host/credentials vs. database not created are the most common causes).

**Missing environment variables**
- The backend does not hard-crash on most missing optional variables (email,
  WhatsApp, Google) — those features degrade gracefully or log warnings/errors
  when used instead. `DB_*` and a working MySQL connection are required for the
  backend to function at all.
- Re-check `backend/.env` against `backend/.env.example` for anything missing.

---

# Security Notes

- **Never commit `.env`** — it's already covered by `.gitignore`. Only commit
  `.env.example` files, and only with placeholder values.
- **Never expose secrets** — API tokens, JWT secrets, DB passwords, and app
  passwords should never appear in code, commit history, chat logs, or
  documentation.
- **Rotate credentials if leaked.** If any real secret has ever been committed
  or shared (see the flagged `.env.example` issue above), treat it as
  compromised: regenerate the Gmail App Password, rotate the UltraMsg token,
  and rotate `JWT_SECRET` (this will invalidate existing sessions — acceptable
  for a security rotation).
- **Use `.env.example` only** as the template committed to the repo. Every
  contributor copies it to their own local `.env` and fills in their own or
  the team's actual credentials.