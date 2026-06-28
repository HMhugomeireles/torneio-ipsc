-- Enrollment status: provisional (pending) vs confirmed.
-- New enrollments start as 'provisional' and must be confirmed to count
-- towards score entry, rankings and shooter counts.
alter table public.tournament_players
  add column status text not null default 'provisional'
  check (status in ('provisional', 'confirmed'));

-- Existing enrollments predate this concept and were effectively confirmed.
update public.tournament_players set status = 'confirmed';
