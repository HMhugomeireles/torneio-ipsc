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
