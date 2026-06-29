-- Per-stage target count, parallel to stage_names.
alter table public.tournaments
  add column if not exists stage_targets jsonb not null default '[0,0,0,0]'::jsonb;

-- Backfill existing tournaments with zeros matching their stage count.
update public.tournaments
  set stage_targets = (
    select coalesce(jsonb_agg(0), '[]'::jsonb) from jsonb_array_elements(stage_names)
  );
