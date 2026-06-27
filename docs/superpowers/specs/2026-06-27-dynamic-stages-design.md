# Dynamic Stages — Design

**Date:** 2026-06-27
**Feature:** Allow adding/removing tournament stages from the Management page (currently fixed at 4).

## Goal

Make the number of stages dynamic, managed in the Management page, instead of being hardcoded to 4.

## Source of truth

The number of stages is the **length of `tournament_settings.stage_names`** (a `string[]`). This is already the de facto source of truth; the app was just hardcoded to iterate `[1, 2, 3, 4]`. After this change, everything iterates `1..stage_names.length`.

The default remains 4 stages (the DB seed creates `["Stage 1", ..., "Stage 4"]`), matching the regulation. This feature only adds the ability to change that count.

## Management page (Settings section)

- **Add stage:** appends `"Stage N"` (N = new length) to `stage_names` and saves settings. The name is editable in the existing per-stage name input.
- **Remove (last stage only):** only the **last** stage shows a Remove button. Removing is allowed only when that stage has **no recorded results**.
  - If it has results → show error: `"Cannot remove a stage with recorded results."` (do not delete).
  - Minimum 1 stage: when only one stage remains, it shows no Remove button.
  - Rationale: `stage_results.stage` stores the stage number. Removing a middle stage would require renumbering all higher results — fragile. Removing only the last stage keeps stage numbers stable.

## Technical changes

1. **Database:** relax the constraint `check (stage between 1 and 4)` to `check (stage >= 1)`. Provided as a manual SQL migration the user runs in Supabase. The seeded `stage_names` and default stay 4.

2. **Pages** — replace hardcoded `[1, 2, 3, 4]` with a range over `stage_names.length`:
   - `OverallRanking.tsx`: per-stage columns become dynamic `S1..Sn`. Header renders `S{n}` for n in `1..count`. Body cells map the same range using `r.perStage[n] ?? 0`.
   - `StageRankings.tsx`: render one section per stage `1..count`, using `settings.stage_names[stage-1] ?? \`Stage ${stage}\``.
   - `ScoreEntry.tsx`: stage `<select>` options become `1..count`.
   - All three read `stage_names.length` from the loaded settings; if settings not yet loaded, fall back to an empty/safe render (no crash).

3. **Data layer (`data.ts`):** add `getStageResultCount(stage: number): Promise<number>` using a Supabase `select('*', { count: 'exact', head: true })` filtered by `stage`. Used by Management before removing a stage.

4. **Management (`Management.tsx`):**
   - Add `addStage()` → `updateSettings({ stage_names: [...names, \`Stage ${names.length + 1}\`] })`.
   - Add `removeLastStage()` → check `getStageResultCount(count)`; if > 0 set the error message; else `updateSettings({ stage_names: names.slice(0, -1) })`. Wrapped in try/catch surfacing errors, consistent with existing handlers.

5. **Scoring:** no changes — `overallRanking`/`rankStage` already derive stages from the results array and are stage-count agnostic. Add one unit test asserting a 5-stage scenario aggregates correctly (locks in the generic behavior).

## Out of scope

- Removing arbitrary (non-last) stages / renumbering results.
- Reordering stages.
- Per-stage configuration beyond its name.

## Testing

- Unit: existing 18 tests stay green; add a 5-stage `overallRanking` test (perStage has keys 1..5, total sums all five).
- Manual: in Management, Add stage → appears in ScoreEntry selector and ranking columns; Remove last empty stage works; Remove last stage with results is blocked with the message.
