-- Enrollment window per tournament: when enrollment opens and closes.
alter table public.tournaments
  add column enroll_start date,
  add column enroll_end date;
