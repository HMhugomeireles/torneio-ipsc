# Torneio IPSC — Site de Resultados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI:** For every task that builds or styles UI (Tasks 7–13), use the `brand-guidelines` skill (Airsoft Book / Bullet UI) for colors, typography, spacing and components. The Tailwind classes shown here are functional scaffolding; apply the design system for visual polish.

**Goal:** Build a public + password-protected web app to register and display the results of a 4-stage IPSC-style airsoft tournament, scored by Hit Factor.

**Architecture:** Vite + React SPA. All scoring math runs client-side as pure functions (heavily unit-tested). Supabase (Postgres + Auth) stores raw data: public reads via RLS for the anon role, writes require an authenticated session (a single shared judge login). Deployed statically to Vercel.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, React Router, Supabase (`@supabase/supabase-js`), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-23-torneio-ipsc-design.md`

---

## File Structure

```
index.html
package.json
vite.config.ts
tsconfig.json
tailwind.config.js
postcss.config.js
.env.example
README.md
supabase/
  schema.sql                 # tables + RLS policies + seed settings row
src/
  main.tsx                   # app entry, router
  App.tsx                    # routes + layout shell
  index.css                  # tailwind directives + theme tokens
  types.ts                   # shared domain types
  lib/
    scoring.ts               # PURE scoring math (TDD core)
    scoring.test.ts
    supabase.ts              # supabase client singleton
    data.ts                  # typed queries/mutations
    auth.tsx                 # AuthProvider, useAuth, ProtectedRoute
  components/
    Layout.tsx               # nav shell (public + admin links)
    Counter.tsx              # accumulator control (label, value, +/-)
    Counter.test.tsx
    Select.tsx               # styled select dropdown
  pages/
    RankingGeral.tsx         # "/"
    RankingEstagios.tsx      # "/estagios"
    Registo.tsx              # "/registo" (protected)
    Gestao.tsx               # "/gestao" (protected)
    Regras.tsx               # "/regras"
    Login.tsx                # "/login"
```

---

## Task 1: Project scaffold (Vite + React + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Scaffold the Vite React-TS app in place**

Run (from the empty repo root; `.` targets current dir, keep existing git/docs):
```bash
npm create vite@latest . -- --template react-ts
npm install
```
If prompted that the directory is not empty, choose **"Ignore files and continue"**.

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind content globs**

Replace `tailwind.config.js` with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Set up Tailwind + base theme in `src/index.css`**

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
body { @apply bg-neutral-950 text-neutral-100 antialiased; }
```

- [ ] **Step 5: Configure Vitest**

Edit `vite.config.ts` to:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test + build scripts**

Ensure `package.json` `"scripts"` contains:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Replace `src/App.tsx` with a minimal placeholder**

```tsx
export default function App() {
  return <div className="p-6 text-2xl font-bold">Torneio IPSC</div>
}
```

- [ ] **Step 8: Verify it builds and tests run**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

Run: `npm test`
Expected: "No test files found" (exit 0) — Vitest is wired but no tests yet.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write the shared types**

```ts
export type Factor = 'maior' | 'menor'

export interface Player {
  id: string
  name: string
  created_at?: string
}

export interface Judge {
  id: string
  name: string
  created_at?: string
}

export interface TournamentSettings {
  id: number
  stage_names: string[]
  default_single_weapon_seconds: number
}

export interface StageResult {
  id: string
  player_id: string
  judge_id: string
  stage: number // 1..4
  factor: Factor
  alpha: number
  charlie: number
  delta: number
  metal: number
  pen_miss: number
  pen_no_shoot: number
  pen_safety: number
  pen_out_of_zone: number
  time_seconds: number
  single_weapon: boolean
  single_weapon_seconds: number
  created_at?: string
  updated_at?: string
}

// Input shape used when creating/updating a result (no server-managed fields)
export type StageResultInput = Omit<StageResult, 'id' | 'created_at' | 'updated_at'>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add domain types"
```

---

## Task 3: Scoring library (TDD core)

This is the heart of the app. Implement strictly test-first.

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `src/lib/scoring.test.ts`

- [ ] **Step 1: Write failing tests for per-result math**

Create `src/lib/scoring.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  rawPoints, penaltyCount, points, finalTime, hitFactor, stagePoints,
} from './scoring'
import type { StageResult } from '../types'

function make(partial: Partial<StageResult>): StageResult {
  return {
    id: 'x', player_id: 'p', judge_id: 'j', stage: 1, factor: 'maior',
    alpha: 0, charlie: 0, delta: 0, metal: 0,
    pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
    time_seconds: 10, single_weapon: false, single_weapon_seconds: 0,
    ...partial,
  }
}

describe('rawPoints', () => {
  it('scores zones with FATOR MAIOR (A5 C4 D2, metal 5)', () => {
    const r = make({ factor: 'maior', alpha: 2, charlie: 1, delta: 1, metal: 1 })
    // 2*5 + 1*4 + 1*2 + 1*5 = 21
    expect(rawPoints(r)).toBe(21)
  })
  it('scores zones with FATOR MENOR (A5 C3 D1, metal 5)', () => {
    const r = make({ factor: 'menor', alpha: 2, charlie: 1, delta: 1, metal: 1 })
    // 2*5 + 1*3 + 1*1 + 1*5 = 19
    expect(rawPoints(r)).toBe(19)
  })
})

describe('penaltyCount', () => {
  it('sums all penalty categories', () => {
    const r = make({ pen_miss: 1, pen_no_shoot: 2, pen_safety: 1, pen_out_of_zone: 1 })
    expect(penaltyCount(r)).toBe(5)
  })
})

describe('points', () => {
  it('subtracts 10 per penalty from raw points', () => {
    const r = make({ factor: 'maior', alpha: 4, pen_miss: 1 }) // 20 - 10 = 10
    expect(points(r)).toBe(10)
  })
  it('never goes below zero', () => {
    const r = make({ factor: 'maior', alpha: 1, pen_miss: 1 }) // 5 - 10 -> 0
    expect(points(r)).toBe(0)
  })
})

describe('finalTime', () => {
  it('returns raw time when not single weapon', () => {
    expect(finalTime(make({ time_seconds: 34.2 }))).toBeCloseTo(34.2)
  })
  it('adds single weapon seconds when enabled', () => {
    const r = make({ time_seconds: 34.2, single_weapon: true, single_weapon_seconds: 20 })
    expect(finalTime(r)).toBeCloseTo(54.2)
  })
  it('ignores single weapon seconds when disabled', () => {
    const r = make({ time_seconds: 34.2, single_weapon: false, single_weapon_seconds: 20 })
    expect(finalTime(r)).toBeCloseTo(34.2)
  })
})

describe('hitFactor', () => {
  it('is points divided by final time', () => {
    const r = make({ factor: 'maior', alpha: 8, time_seconds: 20 }) // 40 / 20 = 2
    expect(hitFactor(r)).toBeCloseTo(2)
  })
  it('is 0 when final time is 0', () => {
    expect(hitFactor(make({ alpha: 8, time_seconds: 0 }))).toBe(0)
  })
})

describe('stagePoints', () => {
  it('gives 100 to the best HF', () => {
    expect(stagePoints(2.0, 2.0)).toBeCloseTo(100)
  })
  it('scales proportionally below the best', () => {
    expect(stagePoints(1.0, 2.0)).toBeCloseTo(50)
  })
  it('is 0 when best HF is 0', () => {
    expect(stagePoints(0, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `scoring.ts` has no exports / module not found.

- [ ] **Step 3: Implement `src/lib/scoring.ts`**

```ts
import type { Factor, StageResult } from '../types'

const ALPHA = 5
const METAL = 5
const CHARLIE: Record<Factor, number> = { maior: 4, menor: 3 }
const DELTA: Record<Factor, number> = { maior: 2, menor: 1 }
const PENALTY = 10

export function rawPoints(r: StageResult): number {
  return (
    r.alpha * ALPHA +
    r.charlie * CHARLIE[r.factor] +
    r.delta * DELTA[r.factor] +
    r.metal * METAL
  )
}

export function penaltyCount(r: StageResult): number {
  return r.pen_miss + r.pen_no_shoot + r.pen_safety + r.pen_out_of_zone
}

export function points(r: StageResult): number {
  return Math.max(0, rawPoints(r) - penaltyCount(r) * PENALTY)
}

export function finalTime(r: StageResult): number {
  return r.time_seconds + (r.single_weapon ? r.single_weapon_seconds : 0)
}

export function hitFactor(r: StageResult): number {
  const t = finalTime(r)
  return t > 0 ? points(r) / t : 0
}

export function stagePoints(hf: number, bestHf: number): number {
  return bestHf > 0 ? 100 * (hf / bestHf) : 0
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all per-result tests PASS.

- [ ] **Step 5: Write failing tests for aggregation**

Append to `src/lib/scoring.test.ts`:
```ts
import { rankStage, overallRanking } from './scoring'
import type { Player } from '../types'

describe('rankStage', () => {
  it('computes HF + stage points and sorts best first', () => {
    const a = make({ id: 'a', player_id: 'A', alpha: 8, time_seconds: 20 }) // HF 2.0
    const b = make({ id: 'b', player_id: 'B', alpha: 8, time_seconds: 40 }) // HF 1.0
    const rows = rankStage([b, a])
    expect(rows.map(r => r.player_id)).toEqual(['A', 'B'])
    expect(rows[0].stagePoints).toBeCloseTo(100)
    expect(rows[1].stagePoints).toBeCloseTo(50)
  })
  it('breaks HF ties by lower final time', () => {
    const a = make({ id: 'a', player_id: 'A', alpha: 4, time_seconds: 10 }) // HF 2.0
    const b = make({ id: 'b', player_id: 'B', alpha: 8, time_seconds: 20 }) // HF 2.0
    const rows = rankStage([a, b])
    expect(rows[0].player_id).toBe('A') // lower time wins the tie
  })
})

describe('overallRanking', () => {
  it('sums stage points per player across stages and ranks', () => {
    const players: Player[] = [{ id: 'A', name: 'Ana' }, { id: 'B', name: 'Bea' }]
    const s1a = make({ id: '1a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 }) // HF2 -> 100
    const s1b = make({ id: '1b', player_id: 'B', stage: 1, alpha: 8, time_seconds: 40 }) // HF1 -> 50
    const s2a = make({ id: '2a', player_id: 'A', stage: 2, alpha: 8, time_seconds: 40 }) // HF1 -> 50
    const s2b = make({ id: '2b', player_id: 'B', stage: 2, alpha: 8, time_seconds: 20 }) // HF2 -> 100
    const rows = overallRanking([s1a, s1b, s2a, s2b], players)
    // A: 100+50=150 ; B: 50+100=150 -> tie, both 150, percentLeader 100
    expect(rows[0].total).toBeCloseTo(150)
    expect(rows[0].percentLeader).toBeCloseTo(100)
    expect(rows.find(r => r.player_id === 'A')!.perStage[1]).toBeCloseTo(100)
  })
  it('includes players with no results as zero', () => {
    const players: Player[] = [{ id: 'A', name: 'Ana' }, { id: 'C', name: 'Carl' }]
    const s1a = make({ id: '1a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 })
    const rows = overallRanking([s1a], players)
    const carl = rows.find(r => r.player_id === 'C')!
    expect(carl.total).toBe(0)
    expect(carl.percentLeader).toBe(0)
  })
})
```

- [ ] **Step 6: Run to verify the new tests fail**

Run: `npm test`
Expected: FAIL — `rankStage` / `overallRanking` not exported.

- [ ] **Step 7: Implement aggregation in `src/lib/scoring.ts`**

Append:
```ts
import type { Player } from '../types'

export interface StageRow {
  result: StageResult
  player_id: string
  points: number
  finalTime: number
  hitFactor: number
  stagePoints: number
}

export function rankStage(results: StageResult[]): StageRow[] {
  const withHf = results.map(r => ({
    result: r,
    player_id: r.player_id,
    points: points(r),
    finalTime: finalTime(r),
    hitFactor: hitFactor(r),
    stagePoints: 0,
  }))
  const bestHf = withHf.reduce((m, r) => Math.max(m, r.hitFactor), 0)
  for (const row of withHf) row.stagePoints = stagePoints(row.hitFactor, bestHf)
  withHf.sort((a, b) =>
    b.stagePoints - a.stagePoints ||
    b.hitFactor - a.hitFactor ||
    a.finalTime - b.finalTime,
  )
  return withHf
}

export interface OverallRow {
  player_id: string
  name: string
  perStage: Record<number, number> // stage -> stage points
  total: number
  percentLeader: number
}

export function overallRanking(results: StageResult[], players: Player[]): OverallRow[] {
  // stage points per (stage, player)
  const stages = Array.from(new Set(results.map(r => r.stage)))
  const stagePointsByPlayer: Record<string, Record<number, number>> = {}
  for (const stage of stages) {
    const rows = rankStage(results.filter(r => r.stage === stage))
    for (const row of rows) {
      stagePointsByPlayer[row.player_id] ??= {}
      stagePointsByPlayer[row.player_id][stage] = row.stagePoints
    }
  }
  const rows: OverallRow[] = players.map(p => {
    const perStage = stagePointsByPlayer[p.id] ?? {}
    const total = Object.values(perStage).reduce((a, b) => a + b, 0)
    return { player_id: p.id, name: p.name, perStage, total, percentLeader: 0 }
  })
  const maxTotal = rows.reduce((m, r) => Math.max(m, r.total), 0)
  for (const r of rows) r.percentLeader = maxTotal > 0 ? (r.total / maxTotal) * 100 : 0
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  return rows
}
```

- [ ] **Step 8: Run all tests to verify they pass**

Run: `npm test`
Expected: all scoring tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: scoring library with hit factor + stage/overall ranking"
```

---

## Task 4: Supabase schema + RLS

**Files:**
- Create: `supabase/schema.sql`, `.env.example`

- [ ] **Step 1: Write the schema SQL**

Create `supabase/schema.sql`:
```sql
-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Judges
create table if not exists public.judges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Single-row settings
create table if not exists public.tournament_settings (
  id int primary key default 1,
  stage_names jsonb not null default '["Estágio 1","Estágio 2","Estágio 3","Estágio 4"]'::jsonb,
  default_single_weapon_seconds numeric not null default 10,
  constraint single_row check (id = 1)
);
insert into public.tournament_settings (id) values (1)
  on conflict (id) do nothing;

-- Stage results
create table if not exists public.stage_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  judge_id uuid not null references public.judges(id),
  stage int not null check (stage between 1 and 4),
  factor text not null check (factor in ('maior','menor')),
  alpha int not null default 0,
  charlie int not null default 0,
  delta int not null default 0,
  metal int not null default 0,
  pen_miss int not null default 0,
  pen_no_shoot int not null default 0,
  pen_safety int not null default 0,
  pen_out_of_zone int not null default 0,
  time_seconds numeric not null,
  single_weapon boolean not null default false,
  single_weapon_seconds numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, stage)
);

-- RLS: public read, authenticated write
alter table public.players enable row level security;
alter table public.judges enable row level security;
alter table public.tournament_settings enable row level security;
alter table public.stage_results enable row level security;

create policy "public read players" on public.players for select using (true);
create policy "auth write players" on public.players for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read judges" on public.judges for select using (true);
create policy "auth write judges" on public.judges for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read settings" on public.tournament_settings for select using (true);
create policy "auth write settings" on public.tournament_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read results" on public.stage_results for select using (true);
create policy "auth write results" on public.stage_results for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

- [ ] **Step 2: Write `.env.example`**

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Manual apply (documented, not automated)**

In the Supabase dashboard → SQL Editor, paste and run `supabase/schema.sql`.
Then create a single judge login: Dashboard → Authentication → Users → Add user (email + password).
This email/password is the shared "password simples" judges will use.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql .env.example
git commit -m "feat: supabase schema with public-read / auth-write RLS"
```

---

## Task 5: Supabase client + data access layer

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/data.ts`

- [ ] **Step 1: Create the client singleton**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Fail loud in dev so misconfiguration is obvious.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 2: Create the typed data access functions**

`src/lib/data.ts`:
```ts
import { supabase } from './supabase'
import type { Player, Judge, StageResult, StageResultInput, TournamentSettings } from '../types'

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function addPlayer(name: string): Promise<Player> {
  const { data, error } = await supabase.from('players').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) throw error
}

export async function getJudges(): Promise<Judge[]> {
  const { data, error } = await supabase.from('judges').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function addJudge(name: string): Promise<Judge> {
  const { data, error } = await supabase.from('judges').insert({ name }).select().single()
  if (error) throw error
  return data
}

export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase.from('judges').delete().eq('id', id)
  if (error) throw error
}

export async function getSettings(): Promise<TournamentSettings> {
  const { data, error } = await supabase.from('tournament_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function updateSettings(patch: Partial<TournamentSettings>): Promise<void> {
  const { error } = await supabase.from('tournament_settings').update(patch).eq('id', 1)
  if (error) throw error
}

export async function getResults(): Promise<StageResult[]> {
  const { data, error } = await supabase.from('stage_results').select('*')
  if (error) throw error
  return data ?? []
}

export async function getResult(playerId: string, stage: number): Promise<StageResult | null> {
  const { data, error } = await supabase
    .from('stage_results').select('*')
    .eq('player_id', playerId).eq('stage', stage).maybeSingle()
  if (error) throw error
  return data
}

// Upsert on the (player_id, stage) unique constraint.
export async function saveResult(input: StageResultInput): Promise<void> {
  const { error } = await supabase
    .from('stage_results')
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'player_id,stage' })
  if (error) throw error
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/lib/data.ts
git commit -m "feat: supabase client + data access layer"
```

---

## Task 6: Auth (login + protected routes)

**Files:**
- Create: `src/lib/auth.tsx`, `src/pages/Login.tsx`

- [ ] **Step 1: Create the auth provider + hook + guard**

`src/lib/auth.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate } from 'react-router-dom'
import { supabase } from './supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-6">A carregar…</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 2: Create the login page**

`src/pages/Login.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error)
    else nav('/registo')
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-xl font-bold">Acesso de juiz</h1>
      <input className="rounded bg-neutral-800 p-3" type="email" placeholder="Email"
        value={email} onChange={e => setEmail(e.target.value)} required />
      <input className="rounded bg-neutral-800 p-3" type="password" placeholder="Password"
        value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button disabled={busy} className="rounded bg-blue-600 p-3 font-bold disabled:opacity-50">
        {busy ? 'A entrar…' : 'Entrar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.tsx src/pages/Login.tsx
git commit -m "feat: auth provider, login page, protected route"
```

---

## Task 7: Counter (accumulator) component

**Files:**
- Create: `src/components/Counter.tsx`
- Test: `src/components/Counter.test.tsx`

> Use the `brand-guidelines` skill for final styling of this control.

- [ ] **Step 1: Write the failing test**

`src/components/Counter.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter'

describe('Counter', () => {
  it('shows label and value, and increments/decrements without going below 0', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<Counter label="ALPHA" value={0} onChange={onChange} />)
    expect(screen.getByText('ALPHA')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(1)

    // at value 0, minus must not go negative
    await userEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).not.toHaveBeenCalledWith(-1)

    rerender(<Counter label="ALPHA" value={3} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `Counter` not found.

- [ ] **Step 3: Implement `src/components/Counter.tsx`**

```tsx
interface CounterProps {
  label: string
  sublabel?: string
  value: number
  onChange: (next: number) => void
  variant?: 'score' | 'penalty'
}

export function Counter({ label, sublabel, value, onChange, variant = 'score' }: CounterProps) {
  const accent = variant === 'penalty' ? 'border-l-red-600' : 'border-l-blue-500'
  const plus = variant === 'penalty' ? 'bg-red-600' : 'bg-green-600'
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-neutral-700 border-l-4 ${accent} bg-neutral-900 p-2`}>
      <div className="flex-1">
        <div className="font-bold tracking-wide">{label}</div>
        {sublabel && <div className="text-xs text-neutral-400">{sublabel}</div>}
      </div>
      <div className="w-8 text-center text-2xl font-extrabold">{value}</div>
      <div className="flex w-24 gap-2">
        <button type="button" aria-label="−"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex-1 rounded bg-neutral-700 p-2 text-lg font-extrabold">−</button>
        <button type="button" aria-label="+"
          onClick={() => onChange(value + 1)}
          className={`flex-1 rounded ${plus} p-2 text-lg font-extrabold`}>+</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: Counter test PASSES (and scoring tests still pass).

- [ ] **Step 5: Commit**

```bash
git add src/components/Counter.tsx src/components/Counter.test.tsx
git commit -m "feat: accumulator Counter component"
```

---

## Task 8: Layout shell + routing

**Files:**
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Create the layout shell**

`src/components/Layout.tsx`:
```tsx
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const linkBase = 'px-3 py-2 rounded text-sm font-semibold'
function cls({ isActive }: { isActive: boolean }) {
  return `${linkBase} ${isActive ? 'bg-blue-600 text-white' : 'text-neutral-300'}`
}

export function Layout() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-1 border-b border-neutral-800 px-3 py-2">
        <span className="mr-3 font-extrabold">TORNEIO</span>
        <NavLink to="/" className={cls} end>Geral</NavLink>
        <NavLink to="/estagios" className={cls}>Estágios</NavLink>
        <NavLink to="/regras" className={cls}>Regras</NavLink>
        {session && <NavLink to="/registo" className={cls}>Registo</NavLink>}
        {session && <NavLink to="/gestao" className={cls}>Gestão</NavLink>}
        <div className="ml-auto">
          {session
            ? <button onClick={signOut} className={`${linkBase} text-neutral-300`}>Sair</button>
            : <NavLink to="/login" className={cls}>Entrar</NavLink>}
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-3"><Outlet /></main>
    </div>
  )
}
```

- [ ] **Step 2: Wire routes in `src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './lib/auth'
import RankingGeral from './pages/RankingGeral'
import RankingEstagios from './pages/RankingEstagios'
import Regras from './pages/Regras'
import Registo from './pages/Registo'
import Gestao from './pages/Gestao'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RankingGeral />} />
        <Route path="estagios" element={<RankingEstagios />} />
        <Route path="regras" element={<Regras />} />
        <Route path="login" element={<Login />} />
        <Route path="registo" element={<ProtectedRoute><Registo /></ProtectedRoute>} />
        <Route path="gestao" element={<ProtectedRoute><Gestao /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 3: Wire providers in `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 4: Create placeholder page stubs so the build passes**

Create each of these minimal files (they are fully implemented in later tasks):
`src/pages/RankingGeral.tsx`, `src/pages/RankingEstagios.tsx`, `src/pages/Regras.tsx`, `src/pages/Registo.tsx`, `src/pages/Gestao.tsx`, each with:
```tsx
export default function Page() { return <div>Em construção</div> }
```
(Name the function to match the file, e.g. `RankingGeral`.)

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: layout shell + routing + providers"
```

---

## Task 9: Gestão page (players, judges, settings)

**Files:**
- Modify: `src/pages/Gestao.tsx`

- [ ] **Step 1: Implement the Gestão page**

Replace `src/pages/Gestao.tsx` with:
```tsx
import { useEffect, useState } from 'react'
import type { Player, Judge, TournamentSettings } from '../types'
import * as data from '../lib/data'

export default function Gestao() {
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [judgeName, setJudgeName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    try {
      setPlayers(await data.getPlayers())
      setJudges(await data.getJudges())
      setSettings(await data.getSettings())
    } catch (e) { setError(String(e)) }
  }
  useEffect(() => { reload() }, [])

  async function addPlayer() {
    if (!playerName.trim()) return
    await data.addPlayer(playerName.trim()); setPlayerName(''); reload()
  }
  async function addJudge() {
    if (!judgeName.trim()) return
    await data.addJudge(judgeName.trim()); setJudgeName(''); reload()
  }
  async function saveSettings(patch: Partial<TournamentSettings>) {
    await data.updateSettings(patch); reload()
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Gestão</h1>
      {error && <p className="text-red-400">{error}</p>}

      <section>
        <h2 className="mb-2 font-bold">Jogadores</h2>
        <div className="flex gap-2">
          <input className="flex-1 rounded bg-neutral-800 p-2" value={playerName}
            onChange={e => setPlayerName(e.target.value)} placeholder="Nome do jogador" />
          <button onClick={addPlayer} className="rounded bg-blue-600 px-4 font-bold">Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-neutral-800">
          {players.map(p => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{p.name}</span>
              <button onClick={async () => { await data.deletePlayer(p.id); reload() }}
                className="text-sm text-red-400">Remover</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Juízes</h2>
        <div className="flex gap-2">
          <input className="flex-1 rounded bg-neutral-800 p-2" value={judgeName}
            onChange={e => setJudgeName(e.target.value)} placeholder="Nome do juiz" />
          <button onClick={addJudge} className="rounded bg-blue-600 px-4 font-bold">Adicionar</button>
        </div>
        <ul className="mt-2 divide-y divide-neutral-800">
          {judges.map(j => (
            <li key={j.id} className="flex items-center justify-between py-2">
              <span>{j.name}</span>
              <button onClick={async () => { await data.deleteJudge(j.id); reload() }}
                className="text-sm text-red-400">Remover</button>
            </li>
          ))}
        </ul>
      </section>

      {settings && (
        <section>
          <h2 className="mb-2 font-bold">Definições</h2>
          <label className="flex items-center gap-2">
            Segundos por defeito (arma única):
            <input type="number" className="w-24 rounded bg-neutral-800 p-2"
              value={settings.default_single_weapon_seconds}
              onChange={e => setSettings({ ...settings, default_single_weapon_seconds: Number(e.target.value) })}
              onBlur={() => saveSettings({ default_single_weapon_seconds: settings.default_single_weapon_seconds })} />
          </label>
          <div className="mt-3 grid gap-2">
            {settings.stage_names.map((name, i) => (
              <input key={i} className="rounded bg-neutral-800 p-2" value={name}
                onChange={e => {
                  const next = [...settings.stage_names]; next[i] = e.target.value
                  setSettings({ ...settings, stage_names: next })
                }}
                onBlur={() => saveSettings({ stage_names: settings.stage_names })} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Gestao.tsx
git commit -m "feat: gestão page for players, judges, settings"
```

---

## Task 10: Registo page (Layout B)

**Files:**
- Modify: `src/pages/Registo.tsx`

- [ ] **Step 1: Implement the Registo page**

Replace `src/pages/Registo.tsx` with:
```tsx
import { useEffect, useMemo, useState } from 'react'
import type { Player, Judge, Factor, StageResultInput, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { Counter } from '../components/Counter'
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf } from '../lib/scoring'

const EMPTY = {
  alpha: 0, charlie: 0, delta: 0, metal: 0,
  pen_miss: 0, pen_no_shoot: 0, pen_safety: 0, pen_out_of_zone: 0,
}

export default function Registo() {
  const [players, setPlayers] = useState<Player[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)

  const [playerId, setPlayerId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [stage, setStage] = useState(1)
  const [factor, setFactor] = useState<Factor>('maior')
  const [counts, setCounts] = useState({ ...EMPTY })
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [singleWeapon, setSingleWeapon] = useState(false)
  const [singleWeaponSeconds, setSingleWeaponSeconds] = useState(0)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setPlayers(await data.getPlayers())
      setJudges(await data.getJudges())
      const s = await data.getSettings()
      setSettings(s)
      setSingleWeaponSeconds(s.default_single_weapon_seconds)
    })()
  }, [])

  // Load existing result when player+stage chosen (edit mode).
  useEffect(() => {
    if (!playerId) return
    (async () => {
      const existing = await data.getResult(playerId, stage)
      if (existing) {
        setJudgeId(existing.judge_id)
        setFactor(existing.factor)
        setCounts({
          alpha: existing.alpha, charlie: existing.charlie, delta: existing.delta, metal: existing.metal,
          pen_miss: existing.pen_miss, pen_no_shoot: existing.pen_no_shoot,
          pen_safety: existing.pen_safety, pen_out_of_zone: existing.pen_out_of_zone,
        })
        setTimeSeconds(existing.time_seconds)
        setSingleWeapon(existing.single_weapon)
        setSingleWeaponSeconds(existing.single_weapon_seconds)
      } else {
        setCounts({ ...EMPTY }); setTimeSeconds(0); setSingleWeapon(false)
        setSingleWeaponSeconds(settings?.default_single_weapon_seconds ?? 10)
      }
    })()
  }, [playerId, stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    const r = {
      ...counts, factor, time_seconds: timeSeconds,
      single_weapon: singleWeapon, single_weapon_seconds: singleWeaponSeconds,
    } as any
    return { pts: calcPoints(r), t: calcFinalTime(r), hf: calcHf(r) }
  }, [counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds])

  const charliePts = factor === 'maior' ? 4 : 3
  const deltaPts = factor === 'maior' ? 2 : 1

  function set<K extends keyof typeof counts>(k: K, v: number) {
    setCounts(c => ({ ...c, [k]: v }))
  }

  async function save() {
    if (!playerId || !judgeId) { setStatus('Escolhe jogador e juiz.'); return }
    const input: StageResultInput = {
      player_id: playerId, judge_id: judgeId, stage, factor, ...counts,
      time_seconds: timeSeconds, single_weapon: singleWeapon,
      single_weapon_seconds: singleWeapon ? singleWeaponSeconds : 0,
    }
    try {
      await data.saveResult(input)
      setStatus('Guardado ✓')
    } catch (e) { setStatus('Erro: ' + String(e)) }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Registo de estágio</h1>

      <div className="grid gap-2">
        <select className="rounded bg-neutral-800 p-3" value={playerId} onChange={e => setPlayerId(e.target.value)}>
          <option value="">— Jogador —</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select className="flex-1 rounded bg-neutral-800 p-3" value={judgeId} onChange={e => setJudgeId(e.target.value)}>
            <option value="">— Juiz —</option>
            {judges.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
          <select className="flex-1 rounded bg-neutral-800 p-3" value={stage} onChange={e => setStage(Number(e.target.value))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{settings?.stage_names[n - 1] ?? `Estágio ${n}`}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {(['maior', 'menor'] as Factor[]).map(f => (
            <button key={f} onClick={() => setFactor(f)}
              className={`flex-1 rounded p-3 font-bold ${factor === f ? 'bg-blue-600' : 'bg-neutral-800'}`}>
              Fator {f === 'maior' ? 'Maior' : 'Menor'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-neutral-400">Pontos</div>
        <div className="grid gap-2">
          <Counter label="ALPHA" sublabel="5 pts" value={counts.alpha} onChange={v => set('alpha', v)} />
          <Counter label="CHARLIE" sublabel={`${charliePts} pts`} value={counts.charlie} onChange={v => set('charlie', v)} />
          <Counter label="DELTA" sublabel={`${deltaPts} pt`} value={counts.delta} onChange={v => set('delta', v)} />
          <Counter label="METAL" sublabel="5 pts" value={counts.metal} onChange={v => set('metal', v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wider text-neutral-400">Penalizações (−10 cada)</div>
        <div className="grid gap-2">
          <Counter variant="penalty" label="Miss / Falha" value={counts.pen_miss} onChange={v => set('pen_miss', v)} />
          <Counter variant="penalty" label="No-shoot" value={counts.pen_no_shoot} onChange={v => set('pen_no_shoot', v)} />
          <Counter variant="penalty" label="Segurança / Procedimento" value={counts.pen_safety} onChange={v => set('pen_safety', v)} />
          <Counter variant="penalty" label="Fora da zona" value={counts.pen_out_of_zone} onChange={v => set('pen_out_of_zone', v)} />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-3">
        <label className="flex items-center gap-2">
          Tempo (seg):
          <input type="number" step="0.01" className="w-28 rounded bg-neutral-800 p-2"
            value={timeSeconds} onChange={e => setTimeSeconds(Number(e.target.value))} />
        </label>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
          Arma única
          {singleWeapon && (
            <>
              <span className="ml-auto">+</span>
              <input type="number" className="w-20 rounded bg-neutral-800 p-2"
                value={singleWeaponSeconds} onChange={e => setSingleWeaponSeconds(Number(e.target.value))} />
              <span>seg</span>
            </>
          )}
        </label>
      </div>

      <div className="flex justify-between rounded-lg border border-blue-600 bg-blue-950/40 p-3 font-bold">
        <span>Pts: {preview.pts}</span>
        <span>Tempo: {preview.t.toFixed(2)}s</span>
        <span>HF: {preview.hf.toFixed(2)}</span>
      </div>

      {status && <p className="text-center">{status}</p>}
      <button onClick={save} className="rounded-lg bg-blue-600 p-4 text-lg font-extrabold">Guardar estágio</button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Registo.tsx
git commit -m "feat: registo page with live hit factor preview"
```

---

## Task 11: Ranking por Estágio page

**Files:**
- Modify: `src/pages/RankingEstagios.tsx`

- [ ] **Step 1: Implement the page**

Replace `src/pages/RankingEstagios.tsx` with:
```tsx
import { useEffect, useState } from 'react'
import type { Player, StageResult, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { rankStage } from '../lib/scoring'

export default function RankingEstagios() {
  const [results, setResults] = useState<StageResult[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)

  useEffect(() => {
    (async () => {
      setResults(await data.getResults())
      setPlayers(await data.getPlayers())
      setSettings(await data.getSettings())
    })()
  }, [])

  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? '—'

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Ranking por estágio</h1>
      {[1, 2, 3, 4].map(stage => {
        const rows = rankStage(results.filter(r => r.stage === stage))
        return (
          <section key={stage}>
            <h2 className="mb-2 font-bold">{settings?.stage_names[stage - 1] ?? `Estágio ${stage}`}</h2>
            {rows.length === 0
              ? <p className="text-neutral-500">Sem resultados.</p>
              : (
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-400">
                    <tr><th>#</th><th>Jogador</th><th>Fator</th><th className="text-right">Pts</th>
                      <th className="text-right">Tempo</th><th className="text-right">HF</th><th className="text-right">Pontos est.</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.result.id} className="border-t border-neutral-800">
                        <td>{i + 1}</td>
                        <td>{nameOf(r.player_id)}</td>
                        <td>{r.result.factor === 'maior' ? 'Maior' : 'Menor'}</td>
                        <td className="text-right">{r.points}</td>
                        <td className="text-right">{r.finalTime.toFixed(2)}s</td>
                        <td className="text-right">{r.hitFactor.toFixed(3)}</td>
                        <td className="text-right font-bold">{r.stagePoints.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingEstagios.tsx
git commit -m "feat: ranking por estágio page"
```

---

## Task 12: Ranking Geral page

**Files:**
- Modify: `src/pages/RankingGeral.tsx`

- [ ] **Step 1: Implement the page**

Replace `src/pages/RankingGeral.tsx` with:
```tsx
import { useEffect, useState } from 'react'
import type { Player, StageResult, TournamentSettings } from '../types'
import * as data from '../lib/data'
import { overallRanking } from '../lib/scoring'

export default function RankingGeral() {
  const [results, setResults] = useState<StageResult[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<TournamentSettings | null>(null)

  useEffect(() => {
    (async () => {
      setResults(await data.getResults())
      setPlayers(await data.getPlayers())
      setSettings(await data.getSettings())
    })()
  }, [])

  const rows = overallRanking(results, players)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Ranking geral</h1>
      {rows.length === 0
        ? <p className="text-neutral-500">Ainda não há jogadores.</p>
        : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-400">
              <tr>
                <th>#</th><th>Jogador</th>
                {[1, 2, 3, 4].map(n => (
                  <th key={n} className="text-right">{settings?.stage_names[n - 1]?.replace('Estágio', 'E') ?? `E${n}`}</th>
                ))}
                <th className="text-right">Total</th><th className="text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id} className="border-t border-neutral-800">
                  <td>{i + 1}</td>
                  <td>{r.name}</td>
                  {[1, 2, 3, 4].map(n => (
                    <td key={n} className="text-right">{(r.perStage[n] ?? 0).toFixed(1)}</td>
                  ))}
                  <td className="text-right font-bold">{r.total.toFixed(1)}</td>
                  <td className="text-right">{r.percentLeader.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingGeral.tsx
git commit -m "feat: ranking geral page"
```

---

## Task 13: Regras page

**Files:**
- Modify: `src/pages/Regras.tsx`

- [ ] **Step 1: Implement the static rules page**

Replace `src/pages/Regras.tsx` with:
```tsx
const zonas = [
  ['Alpha', '5', '5'],
  ['Charlie', '4', '3'],
  ['Delta', '2', '1'],
  ['Metal', '5', '5'],
]
const penalizacoes = [
  ['Acertar em alvo proibido (No-shoot)', '−10', 'Por impacto'],
  ['Falha no alvo (miss)', '−10', 'Por alvo'],
  ['Não disparar / alvo ignorado', '−10', 'Por alvo'],
  ['Falha de segurança / procedimento', '−10', 'Por ocorrência'],
  ['Ultrapassar a zona de disparo', '−10', 'Por ocorrência'],
  ['Disparar depois de acertar no alvo final', '−10', 'Por ocorrência'],
]

export default function Regras() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Regras & pontuação</h1>

      <p className="text-neutral-300">
        4 estágios. Cada estágio é pontuado por <b>Hit Factor</b> = Pontos ÷ Tempo.
        Os pontos do estágio dão 100 ao melhor Hit Factor e proporcional aos restantes.
        A classificação geral é a soma dos pontos dos 4 estágios.
      </p>

      <section>
        <h2 className="mb-2 font-bold">Pontuação por zona</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th>Zona</th><th>Fator Maior (GBBR)</th><th>Fator Menor (AEG/HPA)</th></tr>
          </thead>
          <tbody>
            {zonas.map(z => (
              <tr key={z[0]} className="border-t border-neutral-800">
                <td>{z[0]}</td><td>{z[1]}</td><td>{z[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Penalizações</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400">
            <tr><th>Descrição</th><th>Valor</th><th>Aplica a</th></tr>
          </thead>
          <tbody>
            {penalizacoes.map(p => (
              <tr key={p[0]} className="border-t border-neutral-800">
                <td>{p[0]}</td><td>{p[1]}</td><td>{p[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-neutral-400">
          Arma única: penalização de tempo somada ao tempo do estágio (valor definido pela organização).
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify build + full test suite**

Run: `npm run build && npm test`
Expected: build OK, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Regras.tsx
git commit -m "feat: regras page"
```

---

## Task 14: README + deploy docs

**Files:**
- Create/Modify: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# Torneio IPSC — Site de Resultados

App de resultados para um torneio de tiro airsoft estilo IPSC (4 estágios, Hit Factor).

## Setup

1. Cria um projeto Supabase. No SQL Editor, corre `supabase/schema.sql`.
2. Em Authentication → Users, cria um utilizador (email + password) — é o login partilhado dos juízes.
3. Copia `.env.example` para `.env` e preenche `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
4. `npm install`
5. `npm run dev` para desenvolvimento; `npm run build` para produção.

## Testes

`npm test` — testa a lógica de pontuação (Hit Factor, ranking por estágio e geral).

## Deploy (Vercel)

1. Faz push do repositório para o GitHub.
2. Importa o repo na Vercel (framework: Vite).
3. Em Settings → Environment Variables, adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy. (SPA: a Vercel serve `index.html` para todas as rotas por defeito com Vite.)

## Páginas

- `/` Ranking geral — `/estagios` Ranking por estágio — `/regras` Regras
- `/registo` (login) Registo de pontos — `/gestao` (login) Jogadores, juízes, definições
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: setup and deploy instructions"
```

---

## Self-Review Notes (covered)

- **Spec §4 pages** → Tasks 9–13 (+ Login in Task 6). All five pages implemented.
- **Spec §5 data model** → Task 4 schema matches `types.ts` (Task 2) and `data.ts` (Task 5) field-for-field.
- **Spec §6 registo (Layout B)** → Task 10; selects at top, score + penalty accumulators, editable single-weapon seconds, live HF.
- **Spec §7 security** → Task 4 RLS (public read / auth write) + Task 6 auth/login/ProtectedRoute.
- **Spec §8 calculations** → Task 3, fully TDD: points floored at 0, finalTime adds single-weapon seconds, HF, stagePoints (1st=100, div/0→0), overall sum + percentLeader.
- **Spec §9 zone table / §10 simplifications** → encoded in scoring constants (Task 3) and Regras page (Task 13); negatives floored, all-zero stage → 0.
- **Type consistency:** `StageResult`/`StageResultInput`/`Factor` used identically across types, data, scoring, registo. Penalty field names (`pen_miss`, `pen_no_shoot`, `pen_safety`, `pen_out_of_zone`) consistent across schema, types, data, scoring, registo.
- **Naming:** `rankStage`, `overallRanking`, `stagePoints`, `hitFactor`, `finalTime`, `points`, `penaltyCount` consistent between definition (Task 3) and all call sites (Tasks 10–12).
