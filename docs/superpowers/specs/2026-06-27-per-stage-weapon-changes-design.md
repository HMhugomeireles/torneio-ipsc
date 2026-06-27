# Per-Stage Weapon Changes — Design

**Date:** 2026-06-27
**Feature:** Replace the flat per-tournament single-weapon time penalty with a per-stage model: each stage declares a number of weapon changes; the single-weapon time penalty for a stage is `seconds_per_change × weapon_changes`.

## Motivation

Some stages require a single weapon (no transitions) while others require two (one or more weapon changes). A flat per-tournament single-weapon penalty can't express this. The penalty should scale with how many weapon changes a stage has, since a single-weapon shooter skips exactly those transitions.

## Rule

- Each **tournament** has one value: **seconds per weapon change** (`single_weapon_seconds_per_change`).
- Each **stage** has a **weapon changes** count (integer ≥ 0), stored per tournament as an array parallel to `stage_names`.
- For a result where the shooter used a single weapon, the **time penalty** added to the stage time is:
  `penalty = single_weapon_seconds_per_change × weapon_changes[stage]`
  (e.g. 10 s/change, a stage with 2 changes → +20 s; a stage with 0 changes → +0 s).
- Score entry keeps a per-result **"Single weapon"** checkbox. When checked, the app computes and applies the penalty automatically (the judge no longer types seconds). The computed value is shown read-only (e.g. "Single weapon (+20s)") and the live Hit Factor reflects it.

## Data model changes

### `tournaments`
- Rename column `default_single_weapon_seconds` → **`single_weapon_seconds_per_change`** (numeric, default 10).
- Add column **`stage_weapon_changes`** (jsonb array of integers, parallel to `stage_names`; index i = weapon changes for stage i+1). Default for the 4 seeded stages: `[0,0,0,0]`.

### `stage_results` — unchanged shape
- Keeps `single_weapon` (bool) and `single_weapon_seconds` (numeric). The seconds value is now the **computed** penalty, written at save time as a snapshot, so a result's final time stays stable even if the tournament's configuration changes later.

### Migration (non-destructive — preserves existing data)
The DB already holds a tournament and players. Provide an ALTER migration (run once in the Supabase SQL editor):
```sql
alter table public.tournaments
  rename column default_single_weapon_seconds to single_weapon_seconds_per_change;
alter table public.tournaments
  add column if not exists stage_weapon_changes jsonb not null default '[]'::jsonb;
-- Backfill existing tournaments with zeros matching their stage count.
update public.tournaments
  set stage_weapon_changes = (select coalesce(jsonb_agg(0), '[]'::jsonb) from jsonb_array_elements(stage_names))
  where jsonb_array_length(stage_weapon_changes) = 0;
```
`supabase/schema.sql` is also updated for fresh installs (new column name + `stage_weapon_changes jsonb not null default '[0,0,0,0]'::jsonb`).

## Types

`Tournament` (src/types.ts):
- replace `default_single_weapon_seconds: number` with `single_weapon_seconds_per_change: number`
- add `stage_weapon_changes: number[]`

`StageResult` / `StageResultInput`: unchanged (`single_weapon`, `single_weapon_seconds` stay).

## Scoring

`finalTime` is unchanged — it already adds `single_weapon_seconds` when `single_weapon` is true.

Add a small pure, tested helper (in `src/lib/scoring.ts`):
```ts
export function singleWeaponPenalty(secondsPerChange: number, weaponChanges: number): number {
  return secondsPerChange * weaponChanges
}
```
Used by ScoreEntry to compute the seconds to store.

## UI changes

### Management (`src/pages/Management.tsx`)
- Tournament editor: the single-value input label becomes **"Seconds per weapon change"** bound to `single_weapon_seconds_per_change`.
- Stages editor: each stage row gains a small numeric **"changes"** input next to its name input, bound to `stage_weapon_changes[i]` (NaN-safe, min 0). Saved on blur via `updateTournament`.
- **Add stage:** append a name AND append `0` to `stage_weapon_changes` (keep arrays the same length).
- **Remove last stage:** pop the last entry of BOTH `stage_names` and `stage_weapon_changes`.
- Read-only (past) view: show each stage's changes count alongside its name.
- Robustness: when reading, treat a missing `stage_weapon_changes[i]` as `0` (handles tournaments migrated with `[]`).

### Score Entry (`src/pages/ScoreEntry.tsx`)
- Remove the editable single-weapon seconds `<input>`.
- Keep the **"Single weapon"** checkbox.
- Compute `const swSeconds = singleWeapon ? singleWeaponPenalty(tournament.single_weapon_seconds_per_change, tournament.stage_weapon_changes[stage-1] ?? 0) : 0`.
- Show it read-only next to the checkbox, e.g. `Single weapon (+{swSeconds}s)`.
- Live HF preview uses `swSeconds` as `single_weapon_seconds`.
- On save, set `single_weapon_seconds: swSeconds` (snapshot); `single_weapon: singleWeapon`.
- The previous `singleWeaponSeconds` state (typed value, default from tournament) is removed; the value is now derived from tournament config + selected stage.

## Testing

- Add unit tests for `singleWeaponPenalty`: `(10, 2) → 20`, `(10, 0) → 0`, `(0, 3) → 0`.
- Existing scoring tests stay green (finalTime unchanged).
- Manual: configure a tournament with seconds_per_change = 10 and a stage with 2 changes; in Score Entry, checking "Single weapon" shows "+20s" and the final time/HF reflect it; saving stores 20 in single_weapon_seconds.

## Out of scope

- Per-stage seconds-per-change (the seconds value stays per-tournament).
- Changing how points/penalties (the −10 ones) work.
- Retroactively recomputing already-saved results when config changes (snapshots are intentional).
