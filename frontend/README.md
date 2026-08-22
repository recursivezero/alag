# Frontend Setup

This document explains how to set up and run the frontend locally.

## Prerequisites

* Node.js (v20.x recommended — matches the CI pipeline; v18+ likely works)
* npm

---

## 1. Install Dependencies

Navigate to the frontend folder and install dependencies:

```bash
cd frontend
npm install
```

---

## 2. Configure Environment Variables

Create a `.env` file in the frontend folder by copying the contents of `.env.example`.

```bash
cp .env.example .env
```

Then update the values as required:

```env
PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
PUBLIC_API_BASE_URL=http://localhost:5001/api
```

`PUBLIC_GOOGLE_CLIENT_ID` must be **identical** to the backend's
`GOOGLE_CLIENT_ID` — the backend verifies the Google Sign-In token's audience
against that value. For step-by-step instructions on creating a Google OAuth
Client, see [SETUP_GUIDE.md](../SETUP_GUIDE.md).

---

## 3. Start Development Server

Run the development server:

```bash
npm run dev
```

Frontend server:

```text
http://localhost:4321
```

The dev/preview port is fixed (`strictPort: true` in `astro.config.mjs`) — if
`4321` is already in use, the server will fail to start rather than picking
another port.

> Make sure the backend is running first (`http://localhost:5001` by
> default) — the frontend calls it directly via `PUBLIC_API_BASE_URL` for all
> auth, feed, and admin data.

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

Produces a server-rendered build (Astro `output: 'server'` with the
`@astrojs/node` adapter, standalone mode) rather than a static export.

### Preview

```bash
npm run preview
```

Runs the production build locally on `http://localhost:4321` for a final
check before deploying.

---

## Notes

* Ensure the backend is running and reachable at `PUBLIC_API_BASE_URL`
  before using the app — most pages depend on live API calls.
* Copy `.env.example` to `.env` before running the application.
* Keep `PUBLIC_GOOGLE_CLIENT_ID` in sync with the backend's
  `GOOGLE_CLIENT_ID` — a mismatch will cause Google Sign-In to fail.
* This project uses Tailwind CSS (via `@tailwindcss/vite`) and a `@/` path
  alias that resolves to `src/` (see `astro.config.mjs`).
* Verify Email OTP, Google OAuth, and WhatsApp OTP are configured on the
  backend before testing the corresponding flows in the UI — see
  [SETUP_GUIDE.md](../SETUP_GUIDE.md).