# ALAG - Authentication Layer and Groups

ALAG is a full-stack authentication and social platform built with Astro, Node.js, Hono, and MySQL. It includes email OTP verification, WhatsApp OTP verification, JWT-based authentication, Google Sign-In, password reset functionality, user dashboards, public feed management, and administrative features.



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

## Tech Stack

### Frontend

* Astro
* TypeScript
* Tailwind CSS
* Axios

### Backend

* Node.js
* Hono
* MySQL
* JSON Web Token (JWT)
* Nodemailer
* UltraMsg (WhatsApp OTP)
* Google Auth Library (Google Sign-In)

## Project Structure

```text
alag/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── stores/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── utils/
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
├── cloudflare-worker/           # optional SMS OTP proxy
│
├── SETUP_GUIDE.md
└── README.md
```

## Prerequisites

* Node.js (v20.x recommended — matches the CI pipeline; v18+ likely works)
* npm
* MySQL (8.x recommended, 5.7+ compatible)

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

Configure all required environment variables before starting the application
— see [SETUP_GUIDE.md](./SETUP_GUIDE.md) for details on each variable,
including how to obtain Gmail, Google OAuth, and UltraMsg credentials.

For the frontend, create `.env` from `frontend/.env.example` and configure:

```env
PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

## Database Setup

Import the database schema (this creates the `alag` database itself, so no
separate `CREATE DATABASE` step is needed):

```bash
mysql -u root -p < backend/db/alag.sql
```

## Database Migration

Apply all migrations in `backend/db/migrations/`, in ascending numeric order:

```bash
mysql -u root -p alag < backend/db/migrations/001_add_post_draft_support.sql
mysql -u root -p alag < backend/db/migrations/002_add_mobile_otp_support.sql
mysql -u root -p alag < backend/db/migrations/003_enforce_alt_text_not_null.sql
```

## Admin Seed

Create a default admin account:

```bash
cd backend
npm run seed
```

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

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:4321
```

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
* Copy `.env.example` to `.env` in both `backend/` and `frontend/` before running the application.
* Import `backend/db/alag.sql` before applying migration files.
* Apply all migrations in numeric order, then run `npm run seed` to create the default admin account.
* Verify Email, Google OAuth, and WhatsApp OTP credentials before testing authentication flows — see [SETUP_GUIDE.md](./SETUP_GUIDE.md).
* Keep backend and frontend dependencies separate.

## Documentation

* [backend/README.md](./backend/README.md) — backend-specific setup
* [frontend/README.md](./frontend/README.md) — frontend-specific setup
* [SETUP_GUIDE.md](./SETUP_GUIDE.md) — full setup guide, including Gmail SMTP, Google OAuth, and UltraMsg WhatsApp OTP configuration

## Application URLs

* Backend: `http://localhost:5001`
* Frontend: `http://localhost:4321`