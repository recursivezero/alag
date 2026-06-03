# Recursive Login Project

Recursive Login is a full-stack authentication system with email OTP verification, JWT login, Google sign-in, password reset, and separate frontend and backend folders.

## Features

- JWT authentication (access tokens issued from backend)
- OTP-based email verification and verification flow
- Google authentication (OAuth client integration)
- Password reset flow with email tokens
- User dashboard (feed, liked, saved, profile, settings, explore)
- Post pages with per-post routes and comment section
- Admin panel with user management and waitlist
- Separate frontend and backend projects with clear service layers

## Tech Stack

- Astro JS
- Node.js
- Hono
- Express-style HTTP server
- MySQL
- Axios
- Nodemailer

## Project Structure

- `frontend/` — Astro frontend application
  - `src/pages/` — public, auth, admin, and dashboard pages (login, register, verify-otp, reset-password, welcome, index, posts/[slug], dashboard/feed, dashboard/profile, dashboard/settings, dashboard/explore, dashboard/liked, dashboard/saved)
  - `src/components/` — UI components (admin, auth, posts, ui, user)
  - `src/services/` — client-side API and auth services (`api.ts`, `auth.ts`, `userService.ts`, `postService.ts`, `session.ts`, `google-auth.ts`)
  - `src/stores/` — client state (user/session, theme)
    `backend/` — Authentication API and database logic
  - `src/controllers/` — `auth`, `posts`, `admin`
  - `src/routes/` — API route definitions for auth, posts, admin
  - `src/utils/` — helpers: OTP generator, mailer, JWT, hashing, session helper
    `database/recursive.sql` — Database schema

## Requirements

- Node.js
- MySQL
- Email account for OTP delivery
- Google OAuth client ID for Google login

## Installation

Install dependencies in both project folders:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Database Setup

Create the database and tables using the SQL file:

```bash
mysql -u root -p < database/recursive.sql
```

## Environment Variables

Create a `.env` file inside `backend/` with these values:

```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=recursive
PORT=5001
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
GOOGLE_CLIENT_ID=your_google_client_id
```

If needed, set the frontend API URL in `frontend/.env`:

```bash
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

Note: the frontend relies on `src/services/*` to communicate with the backend; keep `PUBLIC_API_BASE_URL` aligned with the running backend.

## How to Start the Project

### Terminal 1 — Backend first

1. Open Terminal 1.
2. Go to the backend folder:

```bash
cd backend
```

3. Install backend dependencies:

```bash
npm install
```

4. Start the backend server:

```bash
npm run dev
```

Backend URL:

- `http://localhost:5001`

### Terminal 2 — Frontend second

1. Open Terminal 2.
2. Go to the frontend folder:

```bash
cd frontend
```

3. Install Astro frontend dependencies:

```bash
npm install
```

4. Start the Astro frontend:

```bash
npm run dev
```

Frontend URL:

- `http://localhost:4321`

## Scripts

### Backend

From inside `backend/`:

```bash
npm run dev
npm run build
```

### Frontend

From inside `frontend/`:

```bash
npm run dev
npm run build
npm run preview
```

## Important Notes

- Keep backend and frontend dependencies separate.
- The frontend implements a small service layer (`src/services`) that centralizes API requests, auth handling, session storage, and remembered-account logic — prefer adding client API calls there instead of ad-hoc fetches in pages.
- Authentication flow summary: users register/login via the backend auth endpoints; email OTP verification and password-reset flows are supported; JWTs are issued by the backend and consumed by the frontend services for Authorization headers. The frontend also maintains a lightweight session store (`src/stores/userStore.ts`) for client state.
- Admin UI is available under `frontend/src/pages/admin/*` and uses the backend `admin` routes for user management and waitlist operations.
- Database migrations are manual via `database/recursive.sql`. Back up data before applying schema changes.

## Clean Repository Rules

Recommended files to ignore:

```bash
node_modules/
.astro/
dist/
*.log
*.pid
package-lock.json
.DS_Store
```

## Summary


- Backend starts first in Terminal 1
- Frontend starts second in Terminal 2
- Backend URL: `http://localhost:5001`
- Frontend URL: `http://localhost:4321`

Created by Devender
