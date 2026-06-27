# Per-Stage Weapon Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI:** Preserve the existing Airsoft Book / Bullet tactical styling (use `brand-guidelines`). Reuse the exact class patterns already in the pages.

**Goal:** Make the single-weapon time penalty per-stage: each stage declares a weapon-changes count, and the penalty = `seconds_per_change × weapon_changes[stage]`.

**Architecture:** Tournament gains one `single_weapon_seconds_per_change` value (renamed) plus a `stage_weapon_changes` integer array parallel to `stage_names`. Score entry keeps the per-result `single_weapon` checkbox but auto-computes the seconds (snapshotted into the existing `single_weapon_seconds` column on save). `finalTime` is unchanged. A non-destructive ALTER migration preserves existing data.

**Tech Stack:** Vite, React, TypeScript, Tailwind, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-27-per-stage-weapon-changes-design.md`

---

## File Structure

```
supabase/schema.sql                 # tournaments: rename col + add stage_weapon_changes default [0,0,0,0]
supabase/migrations/2026-06-27-per-stage-weapon-changes.sql   # NEW: non-destructive ALTER for the live DB
src/types.ts                        # Tournament: rename field + add stage_weapon_changes
src/lib/scoring.ts                  # add singleWeaponPenalty()
src/lib/scoring.test.ts             # tests for singleWeaponPenalty
src/pages/Management.tsx            # per-stage "changes" input, rename seconds label, keep arrays in sync
src/pages/ScoreEntry.tsx            # derive swSeconds from config; remove typed seconds input
```

---

## Task 1: Types

**Files:** Modify `src/types.ts`

- [ ] **Step 1:** In the `Tournament` interface, replace the line
  `  default_single_weapon_seconds: number` with these two lines:
```ts
  single_weapon_seconds_per_change: number
  stage_weapon_changes: number[] // parallel to stage_names; index i = weapon changes for stage i+1
```
Leave `TournamentInput = Omit<Tournament, 'id' | 'created_at'>` as-is (it picks up the new fields automatically). `StageResult`/`StageResultInput` are unchanged.

- [ ] **Step 2:** Run `npm run build`. Expected: RED in `Management.tsx` and `ScoreEntry.tsx` (they reference `default_single_weapon_seconds`). That is expected; later tasks fix them. Confirm no error originates in `types.ts` itself.

- [ ] **Step 3: Commit**
```bash
git add src/types.ts
git commit -m "feat(types): per-stage weapon changes on Tournament"
```

---

## Task 2: Schema + migration

**Files:** Modify `supabase/schema.sql`; Create `supabase/migrations/2026-06-27-per-stage-weapon-changes.sql`

- [ ] **Step 1:** In `supabase/schema.sql`, in the `create table public.tournaments (...)` block, replace the line
  `  default_single_weapon_seconds numeric not null default 10,`
  with:
```sql
  single_weapon_seconds_per_change numeric not null default 10,
  stage_weapon_changes jsonb not null default '[0,0,0,0]'::jsonb,
```
(Leave `stage_names jsonb not null default '["Stage 1","Stage 2","Stage 3","Stage 4"]'::jsonb,` directly above it unchanged.)

- [ ] **Step 2:** Create `supabase/migrations/2026-06-27-per-stage-weapon-changes.sql` with:
```sql
-- Non-destructive migration: rename the single-weapon seconds column and add
-- a per-stage weapon-changes array. Run once in the Supabase SQL editor.
alter table public.tournaments
  rename column default_single_weapon_seconds to single_weapon_seconds_per_change;

alter table public.tournaments
  add column if not exists stage_weapon_changes jsonb not null default '[]'::jsonb;

-- Backfill existing tournaments with zeros matching their stage count.
update public.tournaments
  set stage_weapon_changes = (
    select coalesce(jsonb_agg(0), '[]'::jsonb) from jsonb_array_elements(stage_names)
  )
  where jsonb_array_length(stage_weapon_changes) = 0;
```

- [ ] **Step 3:** No automated check (SQL is applied manually by the user). Confirm both files saved.

- [ ] **Step 4: Commit**
```bash
git add supabase/schema.sql supabase/migrations/2026-06-27-per-stage-weapon-changes.sql
git commit -m "feat(db): per-stage weapon changes column + non-destructive migration"
```

---

## Task 3: `singleWeaponPenalty` helper (TDD)

**Files:** Modify `src/lib/scoring.ts`, `src/lib/scoring.test.ts`. Do NOT change `finalTime` or other functions.

- [ ] **Step 1:** Append tests to `src/lib/scoring.test.ts`:
```ts
import { singleWeaponPenalty } from './scoring'

describe('singleWeaponPenalty', () => {
  it('multiplies seconds-per-change by weapon changes', () => {
    expect(singleWeaponPenalty(10, 2)).toBe(20)
  })
  it('is 0 when the stage has no weapon changes', () => {
    expect(singleWeaponPenalty(10, 0)).toBe(0)
  })
  it('is 0 when seconds-per-change is 0', () => {
    expect(singleWeaponPenalty(0, 3)).toBe(0)
  })
})
```
(Add `singleWeaponPenalty` to the existing `./scoring` import in the test file rather than a duplicate import line if you prefer; a separate import line as above is also fine.)

- [ ] **Step 2:** Run `npm test`. Expected: FAIL (`singleWeaponPenalty` not exported).

- [ ] **Step 3:** Append to `src/lib/scoring.ts`:
```ts
// Single-weapon time penalty for a stage: seconds-per-change × weapon changes.
export function singleWeaponPenalty(secondsPerChange: number, weaponChanges: number): number {
  return secondsPerChange * weaponChanges
}
```

- [ ] **Step 4:** Run `npm test`. Expected: ALL pass (24 existing + 3 new = 27).

- [ ] **Step 5: Commit**
```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat(scoring): singleWeaponPenalty helper"
```

---

## Task 4: Management — per-stage weapon changes + rename

**Files:** Modify `src/pages/Management.tsx`

Read the file first. Apply these changes (the page builds an editable `draft: Tournament`, with `patchDraft(partial)` updating local state and `saveDraft(patch)` persisting via `updateTournament` then reload; `addStage`/`removeLastStage` mutate `stage_names`).

- [ ] **Step 1: Keep the two stage arrays in sync in `addStage` and `removeLastStage`.**

Replace the `addStage` function:
```tsx
  async function addStage() {
    if (!draft) return
    await saveDraft({ stage_names: [...draft.stage_names, `Stage ${draft.stage_names.length + 1}`] })
  }
```
with:
```tsx
  async function addStage() {
    if (!draft) return
    await saveDraft({
      stage_names: [...draft.stage_names, `Stage ${draft.stage_names.length + 1}`],
      stage_weapon_changes: [...draft.stage_weapon_changes, 0],
    })
  }
```

In `removeLastStage`, the success branch currently calls:
```tsx
      await data.updateTournament(draft.id, { stage_names: draft.stage_names.slice(0, -1) })
```
Replace it with:
```tsx
      await data.updateTournament(draft.id, {
        stage_names: draft.stage_names.slice(0, -1),
        stage_weapon_changes: draft.stage_weapon_changes.slice(0, -1),
      })
```

- [ ] **Step 2: Add a per-stage "changes" input next to each stage name (editable/upcoming branch).**

Find the stages editor block (editable branch):
```tsx
              <div>
                <div className="mb-1 text-xs uppercase tracking-widest text-bullet-muted">Stages</div>
                <div className="grid gap-2">
                  {draft.stage_names.map((name, i) => (
                    <input key={i} className="tactical-input" value={name}
                      onChange={e => { const next = [...draft.stage_names]; next[i] = e.target.value; patchDraft({ stage_names: next }) }}
                      onBlur={() => saveDraft({ stage_names: draft.stage_names })} />
                  ))}
                </div>
```
Replace the `<div className="grid gap-2">...</div>` (the stage_names map) with this version that adds a weapon-changes number input per row:
```tsx
                <div className="grid gap-2">
                  {draft.stage_names.map((name, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="tactical-input flex-1" value={name}
                        onChange={e => { const next = [...draft.stage_names]; next[i] = e.target.value; patchDraft({ stage_names: next }) }}
                        onBlur={() => saveDraft({ stage_names: draft.stage_names })} />
                      <input type="number" min="0" className="tactical-input w-28" title="Weapon changes"
                        value={draft.stage_weapon_changes[i] ?? 0}
                        onChange={e => { const n = Number(e.target.value); const next = [...draft.stage_weapon_changes]; next[i] = Number.isFinite(n) && n >= 0 ? n : 0; patchDraft({ stage_weapon_changes: next }) }}
                        onBlur={() => saveDraft({ stage_weapon_changes: draft.stage_weapon_changes })} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-bullet-muted">Stage name · weapon changes</div>
```

- [ ] **Step 3: Rename the tournament-level seconds field (editable branch).**

Find:
```tsx
              <label className="flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
                Default seconds (single weapon):
                <input type="number" className="tactical-input w-24" value={draft.default_single_weapon_seconds}
                  onChange={e => { const n = Number(e.target.value); patchDraft({ default_single_weapon_seconds: Number.isFinite(n) ? n : 0 }) }}
                  onBlur={() => saveDraft({ default_single_weapon_seconds: draft.default_single_weapon_seconds })} />
              </label>
```
Replace it with:
```tsx
              <label className="flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
                Seconds per weapon change:
                <input type="number" min="0" className="tactical-input w-24" value={draft.single_weapon_seconds_per_change}
                  onChange={e => { const n = Number(e.target.value); patchDraft({ single_weapon_seconds_per_change: Number.isFinite(n) && n >= 0 ? n : 0 }) }}
                  onBlur={() => saveDraft({ single_weapon_seconds_per_change: draft.single_weapon_seconds_per_change })} />
              </label>
```

- [ ] **Step 4: Update the read-only (past) view to show weapon changes.**

Find the past read-only block line:
```tsx
              <p className="uppercase tracking-wider">Stages: <span className="text-bullet-muted">{draft.stage_names.join(', ')}</span></p>
```
Replace it with:
```tsx
              <p className="uppercase tracking-wider">Stages: <span className="text-bullet-muted">{draft.stage_names.map((n, i) => `${n} (${draft.stage_weapon_changes[i] ?? 0} changes)`).join(', ')}</span></p>
              <p className="uppercase tracking-wider">Seconds per weapon change: <span className="text-bullet-muted">{draft.single_weapon_seconds_per_change}</span></p>
```

- [ ] **Step 5:** Run `npm run build`. Expected: still RED only in `ScoreEntry.tsx` (Task 5). Confirm no Management.tsx errors via `npx tsc --noEmit 2>&1 | grep Management` (empty). Run `npm test` → 27 pass.

- [ ] **Step 6: Commit**
```bash
git add src/pages/Management.tsx
git commit -m "feat(manage): per-stage weapon changes, seconds-per-change rename"
```

---

## Task 5: Score Entry — derive the single-weapon penalty

**Files:** Modify `src/pages/ScoreEntry.tsx`

Read the file first. The page currently has `singleWeaponSeconds` state typed by the judge. Replace it with a value derived from the selected tournament's config and the selected stage.

- [ ] **Step 1: Add the helper import.** The file imports from `'../lib/scoring'`:
```tsx
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf } from '../lib/scoring'
```
Add `singleWeaponPenalty`:
```tsx
import { points as calcPoints, finalTime as calcFinalTime, hitFactor as calcHf, singleWeaponPenalty } from '../lib/scoring'
```

- [ ] **Step 2: Remove the `singleWeaponSeconds` state and derive it.**

Delete this line:
```tsx
  const [singleWeaponSeconds, setSingleWeaponSeconds] = useState(0)
```
Below the existing `const stageCount = tournament?.stage_names.length ?? 0` line, add:
```tsx
  const swChanges = tournament?.stage_weapon_changes[stage - 1] ?? 0
  const singleWeaponSeconds = singleWeapon
    ? singleWeaponPenalty(tournament?.single_weapon_seconds_per_change ?? 0, swChanges)
    : 0
```

- [ ] **Step 3: Remove the `setSingleWeaponSeconds` calls in the two effects.**

In the "when tournament changes" effect, delete the line:
```tsx
      setSingleWeaponSeconds(t?.default_single_weapon_seconds ?? 10)
```
In the "load existing result" effect, in the `if (existing)` branch delete:
```tsx
        setSingleWeaponSeconds(existing.single_weapon_seconds)
```
and in the `else` branch delete:
```tsx
        setSingleWeaponSeconds(tournament?.default_single_weapon_seconds ?? 10)
```
(Keep `setSingleWeapon(existing.single_weapon)` / `setSingleWeapon(false)`.)

- [ ] **Step 4: Update the preview `useMemo` dependency array.**

The preview currently builds `r` from `singleWeaponSeconds` and depends on `[counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds]`. Since `singleWeaponSeconds` is now derived (recomputed each render), keep it in the object and ensure the dependency list includes it. Replace the deps array of that `useMemo`:
```tsx
  }, [counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds])
```
with (add `stage` and `tournamentId` so the derived value recomputes correctly):
```tsx
  }, [counts, factor, timeSeconds, singleWeapon, singleWeaponSeconds, stage, tournamentId])
```

- [ ] **Step 5: Replace the single-weapon UI (remove the typed seconds input; show the computed penalty read-only).**

Find the single-weapon label block:
```tsx
        <label className="mt-3 flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
          <input type="checkbox" className="accent-bullet-accent" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
          Single weapon
          {singleWeapon && (
            <>
              <span className="ml-auto text-bullet-accent">+</span>
              <input type="number" className="tactical-input w-20"
                value={singleWeaponSeconds} onChange={e => { const n = Number(e.target.value); setSingleWeaponSeconds(Number.isFinite(n) ? n : 0) }} />
              <span>sec</span>
            </>
          )}
        </label>
```
Replace it with:
```tsx
        <label className="mt-3 flex items-center gap-2 uppercase tracking-widest text-bullet-muted">
          <input type="checkbox" className="accent-bullet-accent" checked={singleWeapon} onChange={e => setSingleWeapon(e.target.checked)} />
          Single weapon
          {singleWeapon && (
            <span className="ml-auto text-bullet-accent">+{singleWeaponSeconds}s ({swChanges} change{swChanges === 1 ? '' : 's'})</span>
          )}
        </label>
```

- [ ] **Step 6: Update `save()` to store the computed seconds.**

In `save()`, the input object currently sets:
```tsx
      single_weapon_seconds: singleWeapon ? singleWeaponSeconds : 0,
```
`singleWeaponSeconds` is already 0 when `singleWeapon` is false (derived), so simplify to:
```tsx
      single_weapon_seconds: singleWeaponSeconds,
```
Keep `single_weapon: singleWeapon` as-is.

- [ ] **Step 7:** Run `npm run build` → must now be GREEN (exit 0). Run `npm test` → 27 pass.

- [ ] **Step 8: Commit**
```bash
git add src/pages/ScoreEntry.tsx
git commit -m "feat(score-entry): auto-compute single-weapon penalty from stage config"
```

---

## Task 6: Final verification

- [ ] **Step 1:** `npm test` → expect `Tests 27 passed`.
- [ ] **Step 2:** `npm run build` → exit 0.
- [ ] **Step 3:** Grep: `grep -rn "default_single_weapon_seconds" src` → expect NO matches (fully renamed). `grep -rn "setSingleWeaponSeconds" src` → expect NO matches (state removed).
- [ ] **Step 4:** No commit (verification only). Report any failures.

---

## Self-Review Notes (coverage)

- **Spec rule (penalty = seconds_per_change × weapon_changes)** → Task 3 helper + Task 5 derivation.
- **Tournament field rename + stage_weapon_changes array** → Task 1 (types), Task 2 (schema), used in Tasks 4–5.
- **Non-destructive migration preserving data** → Task 2 migration file (rename + add + backfill zeros).
- **Management: seconds-per-change rename, per-stage changes input, add/remove keep arrays in sync, past read-only shows changes** → Task 4 steps 1–4.
- **Score Entry: keep checkbox, remove typed input, derive+show penalty read-only, snapshot on save** → Task 5.
- **finalTime unchanged; single_weapon_seconds stays as stored snapshot** → confirmed (no scoring.ts change beyond the additive helper).
- **Type consistency:** `single_weapon_seconds_per_change` and `stage_weapon_changes` used identically in types, schema, Management, ScoreEntry; `singleWeaponPenalty(secondsPerChange, weaponChanges)` signature matches its call site in Task 5.
- **Robustness:** `stage_weapon_changes[i] ?? 0` guards tournaments migrated with `[]` (Management input + ScoreEntry derivation).
- **Known follow-up:** the user must run `supabase/migrations/2026-06-27-per-stage-weapon-changes.sql` on the live DB before the app works against it (the app now reads the renamed column).
```
