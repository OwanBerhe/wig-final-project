# wig-final-project
Final Project for Software Engineering fall 2026

## How to run the server

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (and optionally `PORT`, default `3000`).
3. Apply migrations: `npm run migrate`
4. Start the dev server: `npm run dev`
5. Check it's up:
   - `curl http://localhost:3000/health` → `{"status":"ok"}`
   - `curl http://localhost:3000/users` → JSON array of users
