-- Enrollment capacity (lotação) per tournament. Null = no limit.
alter table public.tournaments
  add column capacity int;
