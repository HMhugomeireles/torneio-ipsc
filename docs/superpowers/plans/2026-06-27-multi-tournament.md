# Multi-Tournament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI:** Page tasks must preserve the existing Airsoft Book / Bullet tactical styling (use the `brand-guidelines` skill). Reuse the exact class patterns already in the codebase (`tactical-input`, `tactical-panel`, `glow-orange`, uppercase + tracking-widest, bullet-accent for highlights, chamfered primary buttons).

**Goal:** Support multiple tournaments — each with its own event date, stages, enrolled players, and rankings — plus a combined championship table on the home page.

**Architecture:** Players and judges are global; tournaments enroll players via a join table. Per-tournament settings (name, date, stage names, single-weapon default) replace the old single settings row. Scoring stays pure and stage-count-agnostic; a new `championshipRanking` sums each player's per-tournament overall totals. Routing gains a home page (championship + tournament list) and per-tournament ranking routes.

**Tech Stack:** Vite, React, TypeScript, Tailwind, react-router-dom, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-27-multi-tournament-design.md`

---

## File Structure

```
supabase/schema.sql            # REWRITTEN: tournaments, tournament_players, players, judges, stage_results + RLS
src/types.ts                   # add Tournament/TournamentInput; StageResult gains tournament_id; remove TournamentSettings
src/lib/dates.ts               # NEW: isPast(eventDate, today) pure helper
src/lib/dates.test.ts          # NEW
src/lib/scoring.ts             # add ChampionshipRow + championshipRanking (rankStage/overallRanking unchanged)
src/lib/scoring.test.ts        # add championshipRanking tests
src/lib/data.ts                # REWRITTEN: tournaments, enrollment, per-tournament results, getAllResults, getStageResultCount
src/App.tsx                    # routes: home, tournament/:id, tournament/:id/stages
src/components/Layout.tsx      # nav: Home, Rules, (Score Entry, Manage)
src/pages/Home.tsx             # NEW: championship table + tournament list
src/pages/OverallRanking.tsx   # per-tournament (reads :id), dynamic stage columns
src/pages/StageRankings.tsx    # per-tournament (reads :id), dynamic stages
src/pages/ScoreEntry.tsx       # tournament selector + enrolled players + dynamic stages + tournament_id on save
src/pages/Management.tsx       # tournaments CRUD + stages + enrollment + global players + judges
src/pages/Rules.tsx            # unchanged
src/pages/Login.tsx            # unchanged
README.md                      # multi-tournament + DB reset note
```

---

## Task 1: Domain types

**Files:** Modify `src/types.ts`

- [ ] **Step 1: Replace `src/types.ts` with:**

```ts
export type Factor = 'major' | 'minor'

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

export interface Tournament {
  id: string
  name: string
  event_date: string // 'YYYY-MM-DD'
  stage_names: string[]
  default_single_weapon_seconds: number
  created_at?: string
}

// Fields editable when creating/updating a tournament (no server-managed fields)
export type TournamentInput = Omit<Tournament, 'id' | 'created_at'>

export interface StageResult {
  id: string
  tournament_id: string
  player_id: string
  judge_id: string
  stage: number // 1..n
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

- [ ] **Step 2:** Run `npm run build`. Expected: it will FAIL — `data.ts`, `ScoreEntry.tsx`, etc. still reference `TournamentSettings`/old shapes. That's expected; later tasks fix every reference. Do NOT try to fix other files here.
- [ ] **Step 3: Commit** (broken build is acceptable mid-refactor, but prefer to land Task 1+ together; commit anyway to checkpoint):

```bash
git add src/types.ts
git commit -m "feat(types): add Tournament types, tournament_id on StageResult"
```

> Note for the controller: Tasks 1–4 form a contract layer. Build is expected red until Task 8 (pages) lands. Run the full `npm test`/`npm run build` green-gate at the end of Task 4 (scoring/data unit level) and again after Task 11 (pages). Each page task individually targets a green build once its dependencies exist.

---

## Task 2: `isPast` date helper (TDD)

**Files:** Create `src/lib/dates.ts`, `src/lib/dates.test.ts`

- [ ] **Step 1: Write `src/lib/dates.test.ts`:**

```ts
import { describe, it, expect } from 'vitest'
import { isPast } from './dates'

describe('isPast', () => {
  it('is true when the event date is before today', () => {
    expect(isPast('2020-01-01', '2026-06-27')).toBe(true)
  })
  it('is false when the event date is today', () => {
    expect(isPast('2026-06-27', '2026-06-27')).toBe(false)
  })
  it('is false when the event date is in the future', () => {
    expect(isPast('2030-12-31', '2026-06-27')).toBe(false)
  })
})
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 3: Write `src/lib/dates.ts`:**

```ts
// ISO 'YYYY-MM-DD' strings compare lexicographically in date order.
export function isPast(eventDate: string, today: string): boolean {
  return eventDate < today
}

// Today's date as 'YYYY-MM-DD' (local-agnostic UTC date).
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
```

- [ ] **Step 4:** Run `npm test`. Expected: the 3 new tests PASS (isPast). (`todayISO` is not unit-tested — it wraps the clock.)
- [ ] **Step 5: Commit:**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat(dates): isPast helper for past/upcoming tournaments"
```

---

## Task 3: `championshipRanking` (TDD)

**Files:** Modify `src/lib/scoring.ts`, `src/lib/scoring.test.ts`. `rankStage`/`overallRanking` are UNCHANGED.

- [ ] **Step 1: Append tests to `src/lib/scoring.test.ts`:**

```ts
import { championshipRanking } from './scoring'

describe('championshipRanking', () => {
  // helper `make` and Player import already exist at top of this file
  it('sums each player\'s per-tournament overall totals across tournaments', () => {
    const playersA = [{ id: 'A', name: 'Ana' }, { id: 'B', name: 'Bea' }]
    const playersB = [{ id: 'A', name: 'Ana' }, { id: 'C', name: 'Carl' }]
    // Tournament 1 (single stage): A wins (HF2 -> 100), B half (HF1 -> 50)
    const t1 = [
      make({ id: 't1a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 }),
      make({ id: 't1b', player_id: 'B', stage: 1, alpha: 8, time_seconds: 40 }),
    ]
    // Tournament 2 (single stage): C wins (HF2 -> 100), A half (HF1 -> 50)
    const t2 = [
      make({ id: 't2c', player_id: 'C', stage: 1, alpha: 8, time_seconds: 20 }),
      make({ id: 't2a', player_id: 'A', stage: 1, alpha: 8, time_seconds: 40 }),
    ]
    const rows = championshipRanking([
      { results: t1, players: playersA },
      { results: t2, players: playersB },
    ])
    const byId = Object.fromEntries(rows.map(r => [r.player_id, r]))
    expect(byId['A'].total).toBeCloseTo(150) // 100 + 50
    expect(byId['B'].total).toBeCloseTo(50)  // 50 + 0
    expect(byId['C'].total).toBeCloseTo(100) // 0 + 100
    expect(rows[0].player_id).toBe('A')      // sorted desc by total
    expect(byId['A'].percentLeader).toBeCloseTo(100)
    expect(byId['B'].percentLeader).toBeCloseTo(33.333, 2)
  })

  it('returns [] for no entries', () => {
    expect(championshipRanking([])).toEqual([])
  })

  it('counts a player appearing in only one tournament', () => {
    const rows = championshipRanking([
      { results: [make({ id: 'x', player_id: 'A', stage: 1, alpha: 8, time_seconds: 20 })],
        players: [{ id: 'A', name: 'Ana' }] },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].total).toBeCloseTo(100)
    expect(rows[0].percentLeader).toBeCloseTo(100)
  })
})
```

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (`championshipRanking` not exported).
- [ ] **Step 3: Append to `src/lib/scoring.ts`:**

```ts
export interface ChampionshipRow {
  player_id: string
  name: string
  total: number
  percentLeader: number
}

export function championshipRanking(
  entries: { results: StageResult[]; players: Player[] }[],
): ChampionshipRow[] {
  const totals: Record<string, { name: string; total: number }> = {}
  for (const entry of entries) {
    for (const row of overallRanking(entry.results, entry.players)) {
      const acc = (totals[row.player_id] ??= { name: row.name, total: 0 })
      acc.total += row.total
      acc.name = row.name // keep latest known name
    }
  }
  const rows: ChampionshipRow[] = Object.entries(totals).map(([player_id, v]) => ({
    player_id, name: v.name, total: v.total, percentLeader: 0,
  }))
  const maxTotal = rows.reduce((m, r) => Math.max(m, r.total), 0)
  for (const r of rows) r.percentLeader = maxTotal > 0 ? (r.total / maxTotal) * 100 : 0
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  return rows
}
```

- [ ] **Step 4:** Run `npm test`. Expected: ALL pass (18 existing + 3 new championship = 21).
- [ ] **Step 5: Commit:**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat(scoring): championshipRanking across tournaments"
```

---

## Task 4: Supabase schema rewrite + data layer

**Files:** Rewrite `supabase/schema.sql`; rewrite `src/lib/data.ts`.

- [ ] **Step 1: Replace `supabase/schema.sql` with:**

```sql
-- ⚠️ CLEAN RESET — run on a project with no real data. Drops existing tables.
drop table if exists public.stage_results cascade;
drop table if exists public.tournament_players cascade;
drop table if exists public.tournament_settings cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.players cascade;
drop table if exists public.judges cascade;

-- Players (global roster)
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Judges (global)
create table public.judges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Tournaments (per-tournament settings)
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  stage_names jsonb not null default '["Stage 1","Stage 2","Stage 3","Stage 4"]'::jsonb,
  default_single_weapon_seconds numeric not null default 10,
  created_at timestamptz not null default now()
);

-- Enrollment (global player ↔ tournament)
create table public.tournament_players (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (tournament_id, player_id)
);

-- Stage results
create table public.stage_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  judge_id uuid not null references public.judges(id) on delete restrict,
  stage int not null check (stage >= 1),
  factor text not null check (factor in ('major','minor')),
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
  unique (tournament_id, player_id, stage)
);

-- RLS: public read, authenticated write
alter table public.players enable row level security;
alter table public.judges enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.stage_results enable row level security;

create policy "public read players" on public.players for select using (true);
create policy "auth write players" on public.players for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read judges" on public.judges for select using (true);
create policy "auth write judges" on public.judges for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read tournaments" on public.tournaments for select using (true);
create policy "auth write tournaments" on public.tournaments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read enroll" on public.tournament_players for select using (true);
create policy "auth write enroll" on public.tournament_players for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "public read results" on public.stage_results for select using (true);
create policy "auth write results" on public.stage_results for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

- [ ] **Step 2: Replace `src/lib/data.ts` with:**

```ts
import { supabase } from './supabase'
import type { Player, Judge, StageResult, StageResultInput, Tournament, TournamentInput } from '../types'

// ---------- Players (global roster) ----------
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

// ---------- Judges (global) ----------
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

// ---------- Tournaments ----------
export async function getTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase.from('tournaments').select('*').order('event_date', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
export async function addTournament(input: { name: string; event_date: string }): Promise<Tournament> {
  const { data, error } = await supabase.from('tournaments').insert(input).select().single()
  if (error) throw error
  return data
}
export async function updateTournament(id: string, patch: Partial<TournamentInput>): Promise<void> {
  const { error } = await supabase.from('tournaments').update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw error
}

// ---------- Enrollment ----------
export async function getEnrolledPlayers(tournamentId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('player:players(*)')
    .eq('tournament_id', tournamentId)
  if (error) throw error
  return (data ?? [])
    .map((r: { player: Player | null }) => r.player)
    .filter((p): p is Player => !!p)
    .sort((a, b) => a.name.localeCompare(b.name))
}
export async function enrollPlayer(tournamentId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from('tournament_players')
    .insert({ tournament_id: tournamentId, player_id: playerId })
  if (error) throw error
}
export async function unenrollPlayer(tournamentId: string, playerId: string): Promise<void> {
  const { error } = await supabase.from('tournament_players')
    .delete().eq('tournament_id', tournamentId).eq('player_id', playerId)
  if (error) throw error
}

// ---------- Results ----------
export async function getResultsForTournament(tournamentId: string): Promise<StageResult[]> {
  const { data, error } = await supabase.from('stage_results').select('*').eq('tournament_id', tournamentId)
  if (error) throw error
  return data ?? []
}
export async function getAllResults(): Promise<StageResult[]> {
  const { data, error } = await supabase.from('stage_results').select('*')
  if (error) throw error
  return data ?? []
}
export async function getResult(tournamentId: string, playerId: string, stage: number): Promise<StageResult | null> {
  const { data, error } = await supabase.from('stage_results').select('*')
    .eq('tournament_id', tournamentId).eq('player_id', playerId).eq('stage', stage).maybeSingle()
  if (error) throw error
  return data
}
export async function saveResult(input: StageResultInput): Promise<void> {
  const { error } = await supabase.from('stage_results')
    .upsert({ ...input, updated_at: new Date().toISOString() }, { onConflict: 'tournament_id,player_id,stage' })
  if (error) throw error
}
export async function getStageResultCount(tournamentId: string, stage: number): Promise<number> {
  const { count, error } = await supabase.from('stage_results')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId).eq('stage', stage)
  if (error) throw error
  return count ?? 0
}
```

- [ ] **Step 3:** Run `npm test`. Expected: 21 pass (scoring/dates unaffected). `npm run build` is still RED (pages reference removed `getSettings`); that's expected until Task 8–11.
- [ ] **Step 4: Commit:**

```bash
git add supabase/schema.sql src/lib/data.ts
git commit -m "feat(data): multi-tournament schema + data access layer"
```

---

## Task 5: Routing

**Files:** Modify `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` with:**

```tsx
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './lib/auth'
import Home from './pages/Home'
import OverallRanking from './pages/OverallRanking'
import StageRankings from './pages/StageRankings'
import Rules from './pages/Rules'
import ScoreEntry from './pages/ScoreEntry'
import Management from './pages/Management'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tournament/:id" element={<OverallRanking />} />
        <Route path="tournament/:id/stages" element={<StageRankings />} />
        <Route path="rules" element={<Rules />} />
        <Route path="login" element={<Login />} />
        <Route path="score-entry" element={<ProtectedRoute><ScoreEntry /></ProtectedRoute>} />
        <Route path="manage" element={<ProtectedRoute><Management /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 2:** Build still red (Home.tsx missing). Proceed. **Commit** with Task 6 (don't commit a missing-import App alone). Skip a standalone commit here; land App + Home together in Task 6's commit.

---

## Task 6: Home page (championship + tournament list)

**Files:** Create `src/pages/Home.tsx`

Implementation brief (write complete TSX following the existing tactical style — uppercase, tracking-widest, `tactical-panel`, tables like OverallRanking):

State: `tournaments: Tournament[]`, `champRows: ChampionshipRow[]`.
On mount (single async IIFE in `useEffect`):
1. `const ts = await data.getTournaments(); setTournaments(ts)`
2. `const all = await data.getAllResults()`
3. Build entries: `const entries = await Promise.all(ts.map(async t => ({ results: all.filter(r => r.tournament_id === t.id), players: await data.getEnrolledPlayers(t.id) })))`
4. `setChampRows(championshipRanking(entries))`

`const today = todayISO()` (from `../lib/dates`).

Render:
- `<h1>` "Championship".
- Section "Championship" table (reuse OverallRanking's table styling): columns `#`, `Player`, `Total` (bullet-accent), `%`. Empty state: "No results yet." (uppercase tracking-widest text-bullet-muted).
- Section "Tournaments": if none → "No tournaments yet." Else a list of cards/rows; each is a `<Link to={\`/tournament/${t.id}\`}>` styled like the interactive card pattern (border white/10, hover border-bullet-accent, cursor-pointer). Show `t.name` (uppercase, bold), `t.event_date`, and a small badge: `isPast(t.event_date, today) ? 'PAST' : 'UPCOMING'` (past = text-bullet-muted, upcoming = text-bullet-accent).

Imports: `useEffect, useState` from react; `Link` from react-router-dom; types `Tournament`; `* as data`; `championshipRanking`, type `ChampionshipRow` from scoring; `isPast, todayISO` from dates.

- [ ] **Step 1:** Create `src/pages/Home.tsx` per the brief.
- [ ] **Step 2:** `npm run build` — should now resolve App + Home (OverallRanking/StageRankings/ScoreEntry/Management still reference old data fns → may still be red). If red ONLY due to those not-yet-updated pages, that's expected. If red due to Home itself, fix Home. Confirm Home has no type errors by checking the build output mentions only the other pages.
- [ ] **Step 3: Commit:**

```bash
git add src/App.tsx src/pages/Home.tsx
git commit -m "feat(home): championship table + tournament list, routing"
```

---

## Task 7: OverallRanking → per tournament

**Files:** Modify `src/pages/OverallRanking.tsx`

Brief (keep existing table styling; make it tournament-scoped and stage-count dynamic):

- `const { id } = useParams()` (react-router-dom). Guard: if no `id`, render nothing meaningful.
- State: `tournament: Tournament | null`, `results: StageResult[]`, `players: Player[]`.
- On mount / when `id` changes: `setTournament(await data.getTournament(id)); setResults(await data.getResultsForTournament(id)); setPlayers(await data.getEnrolledPlayers(id))`.
- `const count = tournament?.stage_names.length ?? 0`
- `const stages = Array.from({ length: count }, (_, i) => i + 1)`
- `const rows = overallRanking(results, players)`
- Heading shows `tournament?.name ?? 'Tournament'`. A back `<Link to="/">` "← Championship" and a `<Link to={\`/tournament/${id}/stages\`}>` "Stage rankings →" are nice (cursor-pointer, bullet-muted hover bullet-text).
- Table: `#`, `Player`, then `stages.map(n => <th>S{n}</th>)`, `Total`, `%`. Body cells use `r.perStage[n] ?? 0`. Empty state "No players yet."

Imports: add `useParams, Link`; type `Tournament`; keep `overallRanking`.

- [ ] **Step 1:** Apply the changes.
- [ ] **Step 2:** `npm run build` (still red only for ScoreEntry/StageRankings/Management). Confirm no OverallRanking-specific errors.
- [ ] **Step 3: Commit:**

```bash
git add src/pages/OverallRanking.tsx
git commit -m "feat(overall): per-tournament overall ranking with dynamic stages"
```

---

## Task 8: StageRankings → per tournament

**Files:** Modify `src/pages/StageRankings.tsx`

Brief (keep styling; tournament-scoped, dynamic stages):

- `const { id } = useParams()`.
- State: `tournament`, `results`, `players` (enrolled).
- Load on `id`: `getTournament(id)`, `getResultsForTournament(id)`, `getEnrolledPlayers(id)`.
- `const count = tournament?.stage_names.length ?? 0`; iterate `Array.from({length: count}, (_,i)=>i+1)` instead of `[1,2,3,4]`.
- Section heading per stage: `tournament?.stage_names[stage-1] ?? \`Stage ${stage}\``.
- Keep the existing per-stage table (rankStage, nameOf via enrolled players). Page `<h1>` shows `tournament?.name ?? 'Tournament'` + " — Stages", with a back `<Link to={\`/tournament/${id}\`}>` "← Overall".

Imports: add `useParams, Link`; type `Tournament`.

- [ ] **Step 1:** Apply.
- [ ] **Step 2:** `npm run build` (red only for ScoreEntry/Management now). Confirm no StageRankings errors.
- [ ] **Step 3: Commit:**

```bash
git add src/pages/StageRankings.tsx
git commit -m "feat(stages): per-tournament stage rankings with dynamic stages"
```

---

## Task 9: ScoreEntry → tournament-scoped

**Files:** Modify `src/pages/ScoreEntry.tsx`

Brief (preserve ALL existing scoring UI — counters, factor toggle, time, single-weapon, live HF, Save button styling). Add a tournament selector and scope everything to it:

New state: `tournaments: Tournament[]`, `tournamentId: string`, and replace the global `players` source with enrolled players for the selected tournament. Keep `judges` global. Replace `settings` with the selected `tournament`.

On mount: `setTournaments(await data.getTournaments())`, `setJudges(await data.getJudges())`. Do NOT load players until a tournament is chosen.

When `tournamentId` changes (effect on `[tournamentId]`):
- if empty: clear players, reset stage to 1.
- else: `const t = tournaments.find(x => x.id === tournamentId)`; `setPlayers(await data.getEnrolledPlayers(tournamentId))`; reset `playerId=''`; `setSingleWeaponSeconds(t?.default_single_weapon_seconds ?? 10)`; clamp `stage` to `<= t.stage_names.length`.

The existing edit-mode effect changes to depend on `[tournamentId, playerId, stage]` and calls `data.getResult(tournamentId, playerId, stage)` (guard `if (!tournamentId || !playerId) return`). On no existing result, reset counts/time/single-weapon and set `singleWeaponSeconds` from the selected tournament's default.

Stage `<select>` options: `Array.from({length: t?.stage_names.length ?? 0}, (_,i)=>i+1).map(n => <option value={n}>{t?.stage_names[n-1] ?? \`Stage ${n}\`}</option>)` where `t` is the selected tournament.

Top of form gets a tournament `<select>` (tactical-input) BEFORE the player select:
`<option value="">— Tournament —</option>` then `tournaments.map(t => <option value={t.id}>{t.name} ({t.event_date})</option>)`.

`save()`: validation becomes `if (!tournamentId || !playerId || !judgeId) { setStatus('Choose a tournament, player and judge.'); return }`. The `input: StageResultInput` now includes `tournament_id: tournamentId`. Everything else (counts, time, single weapon) unchanged.

Imports: add type `Tournament`; remove `TournamentSettings`.

- [ ] **Step 1:** Apply.
- [ ] **Step 2:** `npm run build` (red only for Management now). Confirm no ScoreEntry errors. `npm test` still 21 pass.
- [ ] **Step 3: Commit:**

```bash
git add src/pages/ScoreEntry.tsx
git commit -m "feat(score-entry): tournament selector, enrolled players, dynamic stages"
```

---

## Task 10: Management → tournaments, stages, enrollment, players, judges

**Files:** Modify `src/pages/Management.tsx`

This is the largest page. Keep the existing tactical styling patterns (sections with `text-bullet-accent` headings, `tactical-input`, accent "Add" buttons, red "Remove" buttons, error banner). Build it as ONE component with these sections in order. If the file grows past ~250 lines, that's acceptable here (it's a genuine admin hub); do not split without plan guidance — report as DONE_WITH_CONCERNS if it feels unwieldy.

State:
- `tournaments: Tournament[]`, `selectedId: string` (the tournament being edited), derived `selected = tournaments.find(t => t.id === selectedId) ?? null`.
- `players: Player[]` (global), `judges: Judge[]`, `enrolled: Player[]` (for selected tournament).
- form inputs: `newTournamentName`, `newTournamentDate` (default `todayISO()`), `playerName`, `judgeName`, `enrollPlayerId` (select of a global player to enroll).
- `error: string | null`.
- `const today = todayISO()`; helper `const past = (t: Tournament) => isPast(t.event_date, today)`.

`reload()`: load tournaments, players, judges; if `selectedId` set, load `enrolled = getEnrolledPlayers(selectedId)`. try/catch → setError.

Mutations (each wrapped in try/catch setting `error`, then `reload()`):
- `createTournament()`: requires name + date; `addTournament({ name, event_date })`; clear inputs.
- `selectTournament(id)`: `setSelectedId(id)` then load enrolled.
- `renameTournament(name)` / `setDate(date)`: `updateTournament(selectedId, { name })` / `{ event_date }` on blur. Only when `!past(selected)`.
- `deleteTournament()`: only when `!past(selected)`; on success clear `selectedId`.
- Stages (only when `!past(selected)`):
  - `addStage()`: `updateTournament(selectedId, { stage_names: [...selected.stage_names, \`Stage ${selected.stage_names.length + 1}\`] })`.
  - `renameStage(i, value)` on blur: `updateTournament(selectedId, { stage_names: nextArray })`.
  - `removeLastStage()`: if `selected.stage_names.length <= 1` ignore. `const last = selected.stage_names.length`; `const n = await data.getStageResultCount(selectedId, last)`; if `n > 0` → `setError('Cannot remove a stage with recorded results.')`; else `updateTournament(selectedId, { stage_names: selected.stage_names.slice(0, -1) })`.
  - `default_single_weapon_seconds` input (NaN-safe like ScoreEntry) saved on blur via `updateTournament`.
- Enrollment (only when `!past(selected)`):
  - `enrollExisting()`: if `enrollPlayerId` set → `data.enrollPlayer(selectedId, enrollPlayerId)`.
  - `enrollNew(name)`: `const p = await data.addPlayer(name.trim()); await data.enrollPlayer(selectedId, p.id)`.
  - `removeEnrollment(playerId)`: `data.unenrollPlayer(selectedId, playerId)`.
  - The "enroll existing" select should exclude already-enrolled players: `players.filter(p => !enrolled.some(e => e.id === p.id))`.
- Global Players: `addPlayer()` (global add), `deletePlayer(id)` (try/catch → setError, since FK may restrict if used).
- Judges: `addJudge()`, `deleteJudge(id)` (catch → 'Cannot remove a judge with recorded results.').

Render order (sections):
1. `<h1>Management</h1>` + error banner.
2. **Tournaments**: create form (name input + date input type="date" + Add). List of tournaments: each row shows name, date, PAST/UPCOMING badge, a "Edit" button (`selectTournament`) and, when upcoming, a red "Delete" button. Past rows show a small "read-only" lock note instead of Delete.
3. **Selected tournament editor** (only if `selected`): if `past(selected)` show a read-only notice ("This tournament is in the past and is locked.") and just display its name/date/stages/enrolled (no inputs/buttons). If upcoming, show: name input (onBlur rename), date input (onBlur setDate), stages list (rename inputs + "Add stage" + "Remove last stage"), default-single-weapon input, enrollment (enroll-existing select + Add, enroll-new name input + Add, enrolled list with Remove).
4. **Players (global)**: input + Add; list with Remove.
5. **Judges (global)**: input + Add; list with Remove.

Imports: `useEffect, useState`; types `Player, Judge, Tournament`; `* as data`; `isPast, todayISO` from `../lib/dates`.

- [ ] **Step 1:** Apply the full implementation.
- [ ] **Step 2:** `npm run build` → must now be GREEN (all pages updated). `npm test` → 21 pass.
- [ ] **Step 3: Commit:**

```bash
git add src/pages/Management.tsx
git commit -m "feat(manage): tournaments, stages, enrollment, global players & judges"
```

---

## Task 11: Layout navigation

**Files:** Modify `src/components/Layout.tsx`

Brief: the top-level "Overall" and "Stages" links pointed at single-tournament routes that no longer exist. Replace them so the nav is: `Home` (`to="/"`, end), `Rules` (`to="/rules"`), and when logged in `Score Entry` (`to="/score-entry"`) and `Manage` (`to="/manage"`), plus the Sign in/out control on the right. Keep brand mark, hazard stripe, and all existing classes. Change the brand label only if desired (keep "TOURNAMENT"). The first link label becomes "Home".

- [ ] **Step 1:** Apply.
- [ ] **Step 2:** `npm run build` green; `npm test` 21 pass.
- [ ] **Step 3: Commit:**

```bash
git add src/components/Layout.tsx
git commit -m "feat(nav): home-centric navigation for multi-tournament"
```

---

## Task 12: README + DB reset instructions

**Files:** Modify `README.md`

Brief: update the "Pages" section to the new routes (`/` championship + tournaments, `/tournament/:id`, `/tournament/:id/stages`, `/rules`, `/score-entry`, `/manage`). Add a short "Database" note: the app is multi-tournament; `supabase/schema.sql` performs a **clean reset** (drops and recreates tables) — run it in the Supabase SQL Editor; it is safe because there is no production data yet, but re-running it will wipe data. Keep the publishable-key setup steps. Mention that tournaments have an event date and that past tournaments become read-only.

- [ ] **Step 1:** Apply.
- [ ] **Step 2: Commit:**

```bash
git add README.md
git commit -m "docs: multi-tournament usage and DB reset note"
```

---

## Task 13: Final verification

- [ ] **Step 1:** `npm test` → expect `Tests 21 passed`.
- [ ] **Step 2:** `npm run build` → exit 0.
- [ ] **Step 3:** Grep sanity: `grep -rniE "getSettings|updateSettings|TournamentSettings|tournament_settings" src` → expect NO matches (all migrated). `grep -rn "\[1, 2, 3, 4\]" src` → expect NO matches (all stage iteration is dynamic now).
- [ ] **Step 4:** No commit (verification only). Report any failures.

---

## Self-Review Notes (coverage)

- **Spec multiple tournaments / per-tournament settings** → Task 1 (types), Task 4 (schema+data), Task 10 (Management create/edit).
- **Global players + judges, enrollment** → Task 4 (`tournament_players`, enroll/unenroll, `getEnrolledPlayers`), Task 10 (enroll existing/new, remove).
- **Event date + past/upcoming rules** → Task 2 (`isPast`/`todayISO`), Task 6 (badge), Task 10 (read-only past: no edit/delete; create/edit/delete gated on `!past`). Score entry always allowed (Task 9 has no date gate).
- **Dynamic stages per tournament** → stage iteration via `stage_names.length` in Tasks 6–10; add/remove-last in Task 10 with `getStageResultCount` guard. Supersedes the dynamic-stages spec.
- **Home championship + tournament list** → Task 6 + `championshipRanking` (Task 3).
- **Per-tournament overall & stage rankings** → Tasks 7, 8 (read `:id`).
- **Score entry scoped to tournament** → Task 9 (`tournament_id` on save, enrolled players, dynamic stages, `getResult(tournamentId, …)`).
- **DB reset (no real data)** → Task 4 schema drops+recreates; Task 12 documents it.
- **Cascade on tournament delete; global players/judges preserved** → Task 4 FKs (`on delete cascade` for tournament_players & stage_results referencing tournaments; players/judges not cascaded from tournaments).
- **Scoring unchanged + championship tested** → Task 3 (21 tests). 
- **Type consistency:** `Tournament`/`TournamentInput`, `StageResult.tournament_id`, `StageResultInput`, `ChampionshipRow`, data fn names (`getTournaments`, `getEnrolledPlayers`, `getResultsForTournament`, `getAllResults`, `getStageResultCount`, `saveResult` onConflict `tournament_id,player_id,stage`) are used identically across Tasks 4, 6–10.
- **Known limitation:** date permissions are client-side only (spec §"Event date rules"); RLS stays coarse. Documented, not enforced server-side.
```
