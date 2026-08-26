# Frontend Setup

This document explains how to set up and run the frontend locally.

## Prerequisites

* Node.js (v20.x recommended — matches the CI pipeline; v18+ likely works)
* npm
* Backend server running and reachable (see the backend `README.md`) —
  most pages depend on live API calls

### Technology stack

The frontend is built with:

* **Astro.js** — page framework and routing
* **TypeScript** — application and component logic
* **Tailwind CSS** — styling, configured via `@tailwindcss/vite`
* **`@astrojs/node` adapter** — Node runtime for server-rendered output
* **Server-side rendering** — `output: 'server'` in `astro.config.mjs`
* **Vite** — underlying build/dev tooling, configured through
  `astro.config.mjs`

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

* **`PUBLIC_GOOGLE_CLIENT_ID`** must be **identical** to the backend's
  `GOOGLE_CLIENT_ID` — the backend verifies the Google Sign-In token's
  audience against that value, so a mismatch will cause Google Sign-In to
  fail. For step-by-step instructions on creating a Google OAuth Client, see
  [SETUP_GUIDE.md](../SETUP_GUIDE.md).
* **`PUBLIC_API_BASE_URL`** points to the backend API server (default
  `http://localhost:5001/api`) and is the base URL every frontend API call
  is built from.
* **Never commit the `.env` file.** Use `.env.example` as the reference
  template and keep actual values out of version control.
* **Restart the frontend** after changing any environment variable — `PUBLIC_*`
  values are inlined at build/dev-server start and are not hot-reloaded.

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
`4321` is already in use, the server will fail to start instead of
automatically switching to another port.

> Make sure the backend is running first (`http://localhost:5001` by
> default) — the frontend calls it directly via `PUBLIC_API_BASE_URL` for all
> auth, feed, post, and admin data. Testing frontend flows without the
> backend running will result in failed API calls.

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

Generates a server-rendered production build using the `@astrojs/node`
adapter — not a static export. The output is suitable for deployment behind
a Node process.

### Preview

```bash
npm run preview
```

Runs the production build locally on `http://localhost:4321` for a final
check before deploying.

---

## Notes

### Authentication

The frontend currently supports the following authentication flows, backed
by the corresponding backend APIs:

* Email OTP registration flow
* Dedicated OTP verification page
* Google OAuth login
* WhatsApp OTP verification flow (integrates with the backend's UltraMsg-based
  mobile OTP support)
* JWT / session-based authentication handling (token/session persisted and
  attached to subsequent API requests)
* Forgot password and reset password flow

### User features

Currently implemented user-facing features include:

* User dashboard
* Profile management
* Settings page
* Saved posts
* Liked posts
* Explore page
* Public feed, with category filtering
* Post creation flow
* Image upload modal

### Image upload (Cloudflare R2)

Image uploads are initiated from the frontend but stored via Cloudflare R2
on the backend. The frontend never talks to R2 or handles R2 credentials
directly — it only ever calls the backend API. Flow:

1. User selects an image from the Upload Modal.
2. Frontend validates the image client-side and sends the image data to the
   backend API.
3. Backend uploads the image buffer to the Cloudflare R2 bucket.
4. Backend returns the resulting public image URL.
5. Frontend displays the uploaded image using that R2 public URL.

See the backend `README.md` for the R2 environment variables and bucket
configuration required for this flow to work end-to-end.

### Admin features

The frontend also includes admin-facing functionality, gated behind
protected routes:

* Admin dashboard
* User management
* Add user flow
* Enable/disable user accounts
* Admin-protected routes (inaccessible to non-admin sessions)

### API communication

* The frontend communicates with the backend exclusively through
  `PUBLIC_API_BASE_URL`.
* Authentication requests, post/feed operations, admin operations, and user
  data are all handled through backend APIs — the frontend holds no
  independent data store.
* The backend must be running before testing any frontend flow that touches
  live data (which is effectively all of them).

### General

* Ensure the backend is running and reachable at `PUBLIC_API_BASE_URL`
  before starting the frontend.
* Copy `.env.example` to `.env` before running the application, and never
  commit `.env` to version control.
* Keep `PUBLIC_GOOGLE_CLIENT_ID` synchronized with the backend's
  `GOOGLE_CLIENT_ID` at all times.
* Verify backend Email OTP, Google OAuth, WhatsApp OTP, and Cloudflare R2
  image configuration before testing the corresponding UI flows — see
  [SETUP_GUIDE.md](../SETUP_GUIDE.md) for full setup instructions for each.
* Tailwind CSS is configured using `@tailwindcss/vite`.
* The project uses a `@/` alias that resolves to the `src/` directory (see
  `astro.config.mjs`).
* Follow the current folder structure for components, layouts, pages,
  scripts, and services when adding new code.