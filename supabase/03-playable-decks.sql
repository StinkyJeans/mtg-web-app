-- Lets the Decks page list only the official decks the game can fully play.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query > paste > Run).
-- It is a view, so it always follows the cards' "playable" flag: nothing needs updating after a card import.

create or replace view public.official_decks_status
with (security_invoker = true)
as
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

grant select on public.official_decks_status to authenticated;
