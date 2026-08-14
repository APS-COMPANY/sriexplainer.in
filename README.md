# Sri Explainer

A dark, responsive video streaming application for explainer series. It **only embeds official Rumble iframe URLs** (`https://rumble.com/embed/VIDEO_ID/?pub=...`); it never uploads, downloads, proxies, or copies Rumble media.

## Stack

- `frontend/`: Next.js 15, React 19, TypeScript, Tailwind, React Query, Axios, Framer Motion-ready, Google Sign-In
- `backend/`: Express, SQLite (`better-sqlite3`), Telegram DB Auto-Backup, JWT/bcrypt, Helmet, CORS, rate limiting, Multer and Razorpay
- Production: Fast standalone SQLite database with automatic Telegram cloud backups.

## Run locally

1. Copy `.env` and verify your settings.
2. Install with `npm install` in the repository root.
3. Start the stack with `npm run dev` or run `start.bat`.
4. Open `http://localhost:3000`.

## Configure content

Sign in as an administrator (`appua26145@gmail.com` or `dddr04268@gmail.com` with password `Sriexplainer`) and open `/profile` -> Admin Control Center. Use the protected panel to create series and publish Rumble episodes.

The REST API includes authentication, browsing/search, profile/history/favorites, subscription order/verification, Google Sign-In, Telegram DB backup, and admin CRUD routes.
