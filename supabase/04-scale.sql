-- Makes the database ready for many players. Run once in the Supabase SQL editor
-- (Dashboard > SQL Editor > New query > paste > Run). Safe to run again.
-- Needs 02-real-cards.sql and 03-playable-decks.sql to have been run first.

-- ───────── indexes: the profile record, "my decks" ─────────
-- (the card-name search already has its trigram index, from 02-real-cards.sql)
create index if not exists matches_p1_played_idx on public.matches (p1, played_at desc);
create index if not exists matches_p2_played_idx on public.matches (p2, played_at desc);
create index if not exists matches_winner_idx on public.matches (winner);
create index if not exists decks_owner_idx on public.decks (owner, created_at desc);

-- ───────── the official decks list ─────────
-- 03-playable-decks.sql made this a plain view: every visit to the Decks page counted the unplayable cards of EVERY
-- official deck again. Now it is a stored table that is refreshed after an import (node scripts/import.mjs does it).
-- The app reads it by the same name and columns, so nothing else changes.
do $$
declare kind "char";
begin
  select c.relkind into kind from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'official_decks_status';
  if kind = 'v' then drop view public.official_decks_status;
  elsif kind = 'm' then drop materialized view public.official_decks_status;
  end if;
end $$;

create materialized view public.official_decks_status as
select
  d.id,
  d.name,
  d.deck_type,
  d.code,
  d.release_date,
  -- cards of the main deck / commander the game can't play yet (the sideboard is ignored, like in the game)
  coalesce(count(c.id) filter (where not c.playable), 0)::int as unplayable
from public.decks d
left join public.deck_cards dc on dc.deck_id = d.id and dc.board in ('main', 'commander')
left join public.cards c on c.id = dc.card_id
where d.official
group by d.id;

create unique index official_decks_status_id on public.official_decks_status (id);
create index official_decks_status_newest on public.official_decks_status (release_date desc nulls last, name);
create index official_decks_status_type on public.official_decks_status (deck_type);
create index official_decks_status_name_trgm on public.official_decks_status using gin (name extensions.gin_trgm_ops);

grant select on public.official_decks_status to authenticated;

-- Refreshes the stored list without blocking readers. Only the server's secret key may call it.
create or replace function public.refresh_official_decks()
returns void
language sql
security definer
set search_path = ''
as $$
  refresh materialized view concurrently public.official_decks_status;
$$;
revoke all on function public.refresh_official_decks() from public, anon, authenticated;
grant execute on function public.refresh_official_decks() to service_role;

-- ───────── limits per account (so one account can't fill the database) ─────────
create or replace function public.limit_decks()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner is not null and (select count(*) from public.decks where owner = new.owner) >= 100 then
    raise exception 'You can keep at most 100 decks. Delete one first.';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_decks on public.decks;
create trigger limit_decks before insert on public.decks for each row execute function public.limit_decks();

create or replace function public.limit_deck_cards()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.deck_cards where deck_id = new.deck_id) >= 300 then
    raise exception 'A deck can hold at most 300 different cards.';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_deck_cards on public.deck_cards;
create trigger limit_deck_cards before insert on public.deck_cards for each row execute function public.limit_deck_cards();

-- no deck line of more than 250 copies (existing rows are left alone)
alter table public.deck_cards drop constraint if exists deck_cards_qty_max;
alter table public.deck_cards add constraint deck_cards_qty_max check (qty <= 250) not valid;
