# Backend Setup

This document explains how to set up and run the backend locally.

## Prerequisites

* Node.js (v20.x recommended — matches the CI pipeline; v18+ likely works)
* npm
* MySQL (8.x recommended, 5.7+ compatible)

---

## 1. Install Dependencies

Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install
```

---

## 2. Configure Environment Variables

Create a `.env` file in the backend folder by copying the contents of `.env.example`.

```bash
cp .env.example .env
```

Then update the values as required. For step-by-step instructions on obtaining
the Gmail App Password, Google OAuth Client ID, and UltraMsg credentials, see
[SETUP_GUIDE.md](../SETUP_GUIDE.md).

---

## 3. Database Setup

### Import the schema

The schema file already contains the `CREATE DATABASE` statement, so no
separate manual step is needed — just import it:

```bash
mysql -u <user-name> -p < ./db/alag.sql
```

This creates the `alag` database and its base tables (`users`,
`user_sessions`, `admins`, and post-related tables).

### Apply migrations, in order

Migration files live in `db/migrations/` and must be applied in ascending
numeric order:

```bash
mysql -u <user-name> -p alag < ./db/migrations/001_add_post_draft_support.sql
mysql -u <user-name> -p alag < ./db/migrations/002_add_mobile_otp_support.sql
mysql -u <user-name> -p alag < ./db/migrations/003_enforce_alt_text_not_null.sql
```

There is no automated migration runner — apply new migration files manually,
in numeric order, as they're added.

### Seed an admin account

```bash
npm run seed
```

Creates a default admin using `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`
from `.env` if set, otherwise falling back to `admin@gmail.com` /
`Admin@1234`. Safe to re-run — it skips creation if an admin with that email
already exists. **Change the default password in any shared or production
environment.**

---

## 4. Start Development Server

Run the development server:

```bash
npm run dev
```

Backend server:

```text
http://localhost:5001
```

Interactive API docs (Swagger UI):

```text
http://localhost:5001/api-docs
```

---

## Available Scripts

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm run prod
```

Builds and runs with `NODE_ENV=production` set. Alternatively, run
`npm run build` followed by `npm start` to run the already-compiled build.

### Lint

```bash
npm run lint
```

### Seed

```bash
npm run seed
```

---

## Notes

* Ensure MySQL is running before starting the backend.
* Copy `.env.example` to `.env` before running the application.
* Import `db/alag.sql` before executing migration files — it creates the
  `alag` database itself, so no separate `CREATE DATABASE` step is needed.
* Apply all files in `db/migrations/` in ascending numeric order after
  importing the initial schema.
* Run `npm run seed` after migrations to create a default admin account.
* Verify Email, Google OAuth, and UltraMsg WhatsApp OTP credentials before
  testing authentication flows — see [SETUP_GUIDE.md](../SETUP_GUIDE.md) for
  full setup instructions for each.