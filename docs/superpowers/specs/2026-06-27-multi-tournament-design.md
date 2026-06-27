# Multi-Tournament — Design

**Date:** 2026-06-27
**Feature:** Support multiple tournaments, each with its own stages, enrolled players, and rankings; a combined championship table on the home page. Supersedes and folds in the earlier "dynamic stages" spec (stage count is now per-tournament).

## Overview

Move from a single hardcoded tournament to many. Players and judges are **global**; each tournament **enrolls** players (existing ones from other tournaments, or new names added to the global roster). Each tournament has its own event date, its own stages (dynamic count), its own overall and stage rankings. The home page shows a **combined championship ranking** (sum of each player's per-tournament overall totals across all tournaments) plus a **list of tournaments** to drill into.

## Roles / access

- **Public:** home (championship + tournament list), per-tournament overall and stage rankings.
- **Authenticated (shared judge login):** create/manage tournaments, manage global players & judges, enroll players, and enter scores.

## Event date rules

Each tournament has an `event_date`. A tournament is **past** when `event_date < today`, else **upcoming** (today or future).

- **Create:** any authenticated user, with a name and event date.
- **Edit config** (name, event_date, stages, enrollment): allowed **only for upcoming** tournaments. Past tournaments are **read-only** config.
- **Delete:** allowed **only for upcoming** tournaments. Past tournaments can never be deleted (preserves history).
- **Score entry** (`stage_results`): **always allowed** regardless of date (lets results be corrected after the day).

These date-based permissions are enforced in the app UI. RLS still enforces the coarser rule (public read / authenticated write); the date nuance is client-side. This is acceptable for a shared-login hobby app; noted as a known limitation.

## Data model (Supabase / Postgres)

### `tournaments`
- `id` uuid pk
- `name` text not null
- `event_date` date not null
- `stage_names` jsonb not null default `["Stage 1","Stage 2","Stage 3","Stage 4"]`
- `default_single_weapon_seconds` numeric not null default 10
- `created_at` timestamptz default now()

The number of stages = `stage_names.length`.

### `players` (global roster) — unchanged
- `id` uuid pk, `name` text not null, `created_at`

### `judges` (global) — unchanged
- `id` uuid pk, `name` text not null, `created_at`

### `tournament_players` (enrollment)
- `tournament_id` uuid fk → tournaments(id) on delete cascade
- `player_id` uuid fk → players(id) on delete cascade
- primary key (tournament_id, player_id)

### `stage_results`
- adds `tournament_id` uuid not null fk → tournaments(id) on delete cascade
- `player_id`, `judge_id`, `stage` (check `stage >= 1`), `factor` ('major'|'minor'), zone counts, penalty counts, time/single-weapon fields — as today
- unique constraint becomes **(tournament_id, player_id, stage)**

`tournament_settings` (the old single-row table) is **removed** — settings live per tournament now.

### RLS
Same pattern on all tables: `select using (true)` for public read; `for all using (auth.role()='authenticated') with check (...)` for writes. Add the same two policies to `tournaments` and `tournament_players`.

### Migration
The DB has no real data (only the seeded settings row). Provide a **clean reset** SQL: drop the old tables and create the new schema. `supabase/schema.sql` is rewritten to the new model; the user re-runs it on the project (drops + recreates).

## Routing / pages

- **`/` Home (public):**
  1. **Championship ranking** table (combined across all tournaments).
  2. **Tournaments list** below — each row/card shows name + event date + a "past/upcoming" marker, links to its overall ranking.
- **`/tournament/:id` (public):** that tournament's overall ranking (per-stage columns S1..Sn + total + %).
- **`/tournament/:id/stages` (public):** that tournament's per-stage rankings.
- **`/score-entry` (auth):** first select a **tournament**; the player dropdown lists only that tournament's **enrolled** players; stage select is `1..n` of that tournament; judge/factor/counters/time/single-weapon/live-HF as today. Saves with `tournament_id`.
- **`/manage` (auth):**
  - **Tournaments:** list with past/upcoming state. Create (name + date). Select one to edit (only if upcoming): rename, change date, edit stages (add / remove last empty stage), default single-weapon seconds, and enrollment (add player from global roster or new name; remove enrollment). Delete (only if upcoming). Past tournaments show read-only with a lock note.
  - **Players (global):** add / remove from the global roster.
  - **Judges (global):** add / remove.

## Scoring

Pure functions in `scoring.ts`. Existing `rankStage` and `overallRanking` are unchanged in logic; callers now pass tournament-filtered data.

- **Per tournament overall:** `overallRanking(resultsForTournament, enrolledPlayers)` → existing function. Per-stage columns derive from the tournament's `stage_names.length`.
- **Championship (home):** new pure function
  `championshipRanking(entries: { results: StageResult[]; players: Player[] }[]): ChampionshipRow[]`
  - For each entry (one tournament): compute `overallRanking` → per-player total.
  - Sum each player's totals across entries by `player_id`; carry the player name.
  - `ChampionshipRow = { player_id, name, total, percentLeader }`, `percentLeader = total/maxTotal*100` (0 if maxTotal 0).
  - Include every player appearing in any entry; sort by total desc, then name.
  - Deliberate simplification: tournaments with more stages contribute more points (max 100×stages). No normalization for now.

## Data access (`data.ts`)

New/changed functions:
- `getTournaments()`, `addTournament(name, event_date)`, `updateTournament(id, patch)`, `deleteTournament(id)`
- `getTournament(id)`
- `getEnrolledPlayers(tournamentId)`, `enrollPlayer(tournamentId, playerId)`, `unenrollPlayer(tournamentId, playerId)`
- `getPlayers/addPlayer/deletePlayer` (global) — unchanged
- judges — unchanged
- `getResultsForTournament(tournamentId)`, `getAllResults()` (for championship), `getResult(tournamentId, playerId, stage)`, `saveResult(input)` (input now includes `tournament_id`; upsert onConflict `tournament_id,player_id,stage`)
- `getStageResultCount(tournamentId, stage)` — guard for remove-last-stage

Enrolling a new name = `addPlayer(name)` then `enrollPlayer(tournamentId, newPlayer.id)`.

## Error handling

- Removing a stage with results → blocked, message "Cannot remove a stage with recorded results."
- Editing/deleting a past tournament → the UI does not offer those actions (read-only); a lock note explains why.
- Delete tournament (upcoming) cascades its `stage_results` and `tournament_players`, but not global players/judges.
- All mutations wrapped in try/catch surfacing the error in the page (existing pattern).

## Testing

- Keep existing 18 scoring tests (rankStage/overallRanking logic unchanged).
- Add tests:
  - `overallRanking` still correct for a tournament-filtered slice (sanity).
  - `championshipRanking`: two tournaments, overlapping + non-overlapping players, sums per player, percentLeader, players in only one tournament counted, empty input → [].
- Manual: create two tournaments (one upcoming, one with a past date), enroll players, enter scores, verify per-tournament rankings and the combined championship table; verify past tournament is read-only/undeletable.

## Out of scope

- Normalizing championship points across different stage counts.
- Reordering stages or removing non-last stages.
- Squads/heats/schedules; multiple judge accounts.
- Server-enforced (RLS) date permissions.
