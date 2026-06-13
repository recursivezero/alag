# ALAG - Authentication Layer and Groups

ALAG is a full-stack authentication and social platform built with Astro, Node.js, Hono, and MySQL. It includes email OTP verification, JWT-based authentication, Google Sign-In, password reset functionality, user dashboards, public feed management, and administrative features.

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
* JSON Web Token (JWT)
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

Configure all required environment variables before starting the application.

For the frontend, configure:

```env
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

## Database Setup

Create the database:

```sql
CREATE DATABASE recursive;
```

Import the database schema:

```bash
mysql -u root -p recursive < database/recursive.sql
```

## Database Migration

Run the migration after importing the schema:

```bash
mysql -u root -p recursive < database/migrations/001_add_post_draft_support.sql
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

## Application URLs

* Backend: `http://localhost:5001`
* Frontend: `http://localhost:4321`
