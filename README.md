# Recursive Login Project

Recursive Login is a full-stack authentication system with email OTP verification, JWT login, Google sign-in, password reset, and separate frontend and backend folders.

## Features

- JWT authentication
- OTP-based email verification
- Google authentication
- Password reset flow
- Separate frontend and backend projects

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
- `backend/` — Authentication API and database logic
- `database/recursive.sql` — Database schema

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
- Use Astro packages only inside `frontend/`.
- Keep the repo clean by removing temporary log, pid, and lock files when they are not needed.

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

Created by Sonu
Last Updated: May 19, 2026
