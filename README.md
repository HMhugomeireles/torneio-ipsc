# IPSC Tournament — Results Site

Results app for an IPSC-style airsoft shooting tournament (4 stages, Hit Factor).

## Setup

1. Create a Supabase project. In the SQL Editor, run `supabase/schema.sql`.
2. In Authentication → Users, create a user (email + password) — this is the shared judges' login.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   (Project Settings → API Keys → **Publishable key**, in the `sb_publishable_...` format; it replaces the old `anon`
   key, which is being deprecated). It has the same low privileges, so the RLS policies behave the same.
4. `npm install`
5. `npm run dev` for development; `npm run build` for production.

## Tests

`npm test` — tests the scoring logic (Hit Factor, stage ranking, and overall ranking).

## Deploy (Vercel)

1. Push the repository to GitHub.
2. Import the repo into Vercel (framework: Vite).
3. In Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy. The `vercel.json` file (included) rewrites all routes to `index.html` (required for the SPA's client-side routing).

## Pages

- `/` Overall ranking — `/estagios` Stage rankings — `/regras` Rules
- `/registo` (login) Score entry — `/gestao` (login) Players, judges, settings
