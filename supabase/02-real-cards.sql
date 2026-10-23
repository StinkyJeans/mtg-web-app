-- Run ONCE in Supabase (SQL Editor -> New query -> paste -> Run), after schema.sql.
-- Prepares the database for real MTG cards (Scryfall) and official decks (MTGJSON).

-- ───────── cards: all card types + display details ─────────
alter table public.cards drop constraint if exists cards_check;   -- the old "creature <=> has power" rule

alter table public.cards alter column type type text using type::text;
drop type public.card_type;
alter table public.cards add constraint cards_type_check
  check (type in ('land','creature','instant','sorcery','enchantment','artifact','planeswalker','battle','other'));

alter table public.cards
  add column if not exists type_line text,
  add column if not exists mana_cost text,
  add column if not exists cmc numeric not null default 0,
  add column if not exists colors text[] not null default '{}',
  add column if not exists oracle_text text,
  add column if not exists rarity text,
  add column if not exists set_code text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists oracle_id uuid unique,        -- Scryfall's id for the card (shared by all printings)
  add column if not exists scryfall_id uuid,
  add column if not exists playable boolean not null default false;  -- can the game engine play it yet?

-- The hand-made starter cards (no oracle_id) are valid for the engine.
update public.cards set playable = true where oracle_id is null;

-- Fast name search and filters over ~35k cards.
create extension if not exists pg_trgm with schema extensions;
create index if not exists cards_name_trgm on public.cards using gin (name extensions.gin_trgm_ops);
create index if not exists cards_type_idx on public.cards (type);
create index if not exists cards_playable_idx on public.cards (playable) where playable;

-- ───────── decks: official decks (no owner) and card boards ─────────
alter table public.decks alter column owner drop not null;      -- official decks belong to nobody
alter table public.decks drop constraint if exists decks_name_check;
alter table public.decks add constraint decks_name_check check (char_length(name) between 1 and 120);
alter table public.decks
  add column if not exists official boolean not null default false,
  add column if not exists deck_type text,                      -- e.g. 'Commander Deck', 'Theme Deck'
  add column if not exists code text,                           -- set code
  add column if not exists release_date date,
  add column if not exists source text,
  add column if not exists file_name text unique;               -- MTGJSON id, makes the import re-runnable

create policy "signed-in users can read official decks"
  on public.decks for select to authenticated using (official);

alter table public.deck_cards
  add column if not exists board text not null default 'main' check (board in ('main','side','commander'));
alter table public.deck_cards drop constraint if exists deck_cards_pkey;
alter table public.deck_cards add primary key (deck_id, card_id, board);
create index if not exists deck_cards_card_idx on public.deck_cards (card_id);

create policy "signed-in users can read official deck cards"
  on public.deck_cards for select to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and d.official));
