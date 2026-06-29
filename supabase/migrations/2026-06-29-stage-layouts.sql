-- Per-stage layout: placed elements (targets, areas, walls…) for a stage.
create table if not exists public.stage_layouts (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage int not null check (stage >= 1),
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tournament_id, stage)
);

alter table public.stage_layouts enable row level security;

create policy "public read stage_layouts" on public.stage_layouts for select using (true);
create policy "auth write stage_layouts" on public.stage_layouts for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
