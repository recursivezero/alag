# Backend Setup

This document explains how to set up and run the backend locally.

## Prerequisites

* Node.js (v20.x recommended — matches the CI pipeline; v18+ likely works)
* npm
* MySQL (8.x recommended, 5.7+ compatible)
* A Cloudflare account with an R2 bucket created (for image upload support)

---

## 1. Install Dependencies

Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install
```

### Cloudflare R2 storage dependency

Image uploads are handled through Cloudflare R2 using the S3-compatible SDK.
If it isn't already present in `package.json`, install it explicitly:

```bash
npm install @aws-sdk/client-s3
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

### Cloudflare R2 environment variables

The following variables are required for image upload support and must be
added to `.env`:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_URL=
```

Where to get these values from the Cloudflare dashboard:

* **R2_ACCOUNT_ID** — found on the main Cloudflare dashboard overview page, or
  in the R2 section URL (`dash.cloudflare.com/<account-id>/r2`).
* **R2_ACCESS_KEY_ID** / **R2_SECRET_ACCESS_KEY** — generated under
  **R2 → Manage R2 API Tokens → Create API Token**. The secret key is shown
  only once at creation time, so store it securely.
* **R2_BUCKET_NAME** — the name of the bucket created under **R2 → Overview**
  (e.g. `alag-post-images`).
* **R2_ENDPOINT** — the S3-compatible endpoint shown for your account, in the
  form `https://<account-id>.r2.cloudflarestorage.com`.
* **R2_PUBLIC_URL** — the public bucket URL (either the R2.dev subdomain or a
  custom domain connected under **R2 → Bucket Settings → Public Access**).
  This is **required** for displaying uploaded images, since it's the base
  URL the frontend uses to render them.

**Never commit the `.env` file.** Use `.env.example` as the reference template
when adding or renaming variables, and keep actual secrets out of version
control. Restart the backend any time you add or change an environment
variable — values are read at process startup and are not hot-reloaded.

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

Migration files live in `db/migrations/` and **must** be applied in ascending
numeric order — each migration assumes the previous one has already run:

```bash
mysql -u <user-name> -p alag < ./db/migrations/001_add_post_draft_support.sql
mysql -u <user-name> -p alag < ./db/migrations/002_add_mobile_otp_support.sql
mysql -u <user-name> -p alag < ./db/migrations/003_enforce_alt_text_not_null.sql
```

Current migrations, in required order:

| Order | File | Purpose |
|-------|------|---------|
| 001 | `001_add_post_draft_support.sql` | Adds draft-state support to posts |
| 002 | `002_add_mobile_otp_support.sql` | Adds mobile/WhatsApp OTP verification support |
| 003 | `003_enforce_alt_text_not_null.sql` | Enforces `NOT NULL` on post image alt text |

There is no automated migration runner — apply new migration files manually,
in ascending numeric order, as they're added.

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

Raw OpenAPI JSON:

```text
http://localhost:5001/api-docs/openapi.json
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

### Authentication

The backend currently implements the following authentication features:

* Email OTP verification during registration
* Google OAuth login
* WhatsApp OTP verification (via UltraMsg)
* JWT-based authentication for session tokens
* User session management (`user_sessions` table)
* Forgot password / reset password flow

Registration currently accepts either a verified email OTP **or** a verified
mobile OTP to complete sign-up (OR-logic, not both required).

### Image storage (Cloudflare R2)

Post images are uploaded and served through Cloudflare R2 rather than being
stored as base64 in MySQL. Upload flow:

1. Frontend uploads the image to the backend.
2. Backend validates the image (type/size checks).
3. Backend uploads the buffer to the configured R2 bucket.
4. Backend stores the resulting public image URL (built from
   `R2_PUBLIC_URL`) against the post record.
5. Frontend displays the image directly from that public URL.

Uploaded objects are stored using the following key structure:

```text
posts/{userId}/{unique-file-name}
```

Deleting a post (or replacing its image) also removes the corresponding
object from the R2 bucket, so orphaned files aren't left behind.

### Posts and drafts

* Post creation APIs support both publishing directly and saving as a draft.
* Draft posts can be edited and published later.
* Alt text on post images is enforced as `NOT NULL` at the database level
  (see migration `003`) — the backend auto-generates a fallback alt text
  when one isn't explicitly provided, so image uploads don't fail validation.

### General

* Ensure MySQL is running before starting the backend.
* Copy `.env.example` to `.env` before running the application, and never
  commit `.env` to version control.
* Import `db/alag.sql` before executing migration files — it creates the
  `alag` database itself, so no separate `CREATE DATABASE` step is needed.
* Apply all files in `db/migrations/` in ascending numeric order after
  importing the initial schema.
* Run `npm run seed` after migrations to create a default admin account.
* Restart the backend after changing any environment variable.
* Verify Email, Google OAuth, UltraMsg WhatsApp OTP, and Cloudflare R2
  credentials before testing authentication and image upload flows — see
  [SETUP_GUIDE.md](../SETUP_GUIDE.md) for full setup instructions for each.