# Backend Setup

This document explains how to set up and run the backend locally.

## Prerequisites

* Node.js (v18 or later recommended)
* npm
* MySQL

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

Update the values as required.

Example:

```env
PORT=5001

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=recursive

JWT_SECRET=your_secret

EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true

GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 3. Database Setup

Create the database:

```sql
CREATE DATABASE recursive;
```

Import the database dump:

```bash
mysql -u root -p recursive < ../database/recursive.sql
```

Apply the migration:

```bash
mysql -u root -p recursive < ../database/migrations/001_add_post_draft_support.sql
```

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
npm start
```

---

## Notes

* Ensure MySQL is running before starting the backend.
* Copy `.env.example` to `.env` before running the application.
* Import `recursive.sql` before executing migration files.
* Verify email and Google OAuth credentials before testing authentication flows.
* Apply database migrations after importing the initial database dump.
