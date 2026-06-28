-- Unique sequential registration number per player, shown as e.g. #0001.
-- Auto-assigned on creation and immutable.
create sequence if not exists public.players_reg_no_seq;

alter table public.players
  add column reg_no integer not null unique default nextval('public.players_reg_no_seq');

-- Tie the sequence lifecycle to the column.
alter sequence public.players_reg_no_seq owned by public.players.reg_no;
