# Recursive Login Project

Recursive Login is a full-stack authentication platform built with Astro, Node.js, Hono, and MySQL. It supports email OTP verification, JWT-based authentication, Google Sign-In, password reset functionality, user dashboards, post management, and admin features.

## Features

* JWT-based authentication
* Email OTP verification
* Google OAuth authentication
* Password reset via email
* User dashboard
* Public feed and post management
* Like and save post functionality
* User profile and settings management
* Admin dashboard and user management
* MySQL database integration

## Tech Stack

### Frontend

* Astro
* TypeScript
* Axios

### Backend

* Node.js
* Hono
* MySQL
* JWT
* Nodemailer

## Project Structure

```text
alag/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── stores/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── utils/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── database/
│   ├── recursive.sql
│   └── migrations/
│       └── 001_add_post_draft_support.sql
│
└── README.md
```

## Prerequisites

* Node.js (v18 or later recommended)
* npm
* MySQL

## Installation

Install dependencies for both frontend and backend:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Environment Variables

Copy:

```bash
backend/.env.example
```

to:

```bash
backend/.env
```

and provide the required values.

If required, configure the frontend environment:

```env
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

## Database Setup

Create the database:

```sql
CREATE DATABASE recursive;
```

Import the database dump:

```bash
mysql -u root -p recursive < database/recursive.sql
```

## Database Migration

After importing the database dump, execute:

```bash
mysql -u root -p recursive < database/migrations/001_add_post_draft_support.sql
```

## Running the Application

Open two separate terminals to run the backend and frontend simultaneously.

### Terminal 1 — Start Backend

```bash
cd backend
npm run dev
```

Backend URL:

```text
http://localhost:5001
```

### Terminal 2 — Start Frontend

```bash
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:4321
```

### Start Backend

```bash
cd backend
npm run dev
```

Backend URL:

```text
http://localhost:5001
```

### Start Frontend

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
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

## Important Notes

* Ensure MySQL is running before starting the backend.
* Copy `.env.example` to `.env` before running the application.
* Import `recursive.sql` before executing migration files.
* Verify email and Google OAuth credentials before testing authentication flows.
* Keep backend and frontend dependencies separate.

## Repository Ignore Rules

```text
node_modules/
.astro/
dist/
.env
.env.*
!.env.example
*.log
.DS_Store
```

## Application URLs

* Backend: http://localhost:5001
* Frontend: http://localhost:4321
