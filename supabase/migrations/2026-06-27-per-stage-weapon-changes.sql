-- Non-destructive migration: rename the single-weapon seconds column and add
-- a per-stage weapon-changes array. Run once in the Supabase SQL editor.
alter table public.tournaments
  rename column default_single_weapon_seconds to single_weapon_seconds_per_change;

alter table public.tournaments
  add column if not exists stage_weapon_changes jsonb not null default '[0,0,0,0]'::jsonb;

-- Backfill existing tournaments with zeros matching their stage count.
update public.tournaments
  set stage_weapon_changes = (
    select coalesce(jsonb_agg(0), '[]'::jsonb) from jsonb_array_elements(stage_names)
  )
  where jsonb_array_length(stage_weapon_changes) = 0;
