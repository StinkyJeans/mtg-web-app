-- DuelRealm MTG schema. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run only on an empty project (it does not use "if not exists" everywhere).

-- ───────── profiles (one row per auth user, created automatically) ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 1 and 50),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "signed-in users can read profiles"
  on public.profiles for select to authenticated using (true);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── cards (read-only for players; you add cards in the dashboard) ─────────
create type public.card_type as enum ('land', 'creature');

create table public.cards (
  id text primary key,                         -- same id the engine uses, e.g. 'grizzly-bears'
  name text not null,
  type public.card_type not null,
  cost int not null default 0 check (cost >= 0),
  power int,
  toughness int,
  image_path text,                             -- path inside the 'card-art' storage bucket
  check ((type = 'creature') = (power is not null and toughness is not null))
);
alter table public.cards enable row level security;

create policy "signed-in users can read cards"
  on public.cards for select to authenticated using (true);
-- No insert/update/delete policies on purpose: only you (dashboard) or the server's secret key can write.

insert into public.cards (id, name, type, cost, power, toughness) values
  ('mountain',      'Mountain',      'land',     0, null, null),
  ('forest',        'Forest',        'land',     0, null, null),
  ('grizzly-bears', 'Grizzly Bears', 'creature', 2, 2, 2),
  ('hill-giant',    'Hill Giant',    'creature', 3, 3, 3);

-- ───────── decks (private to their owner) ─────────
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.decks enable row level security;

create policy "owners manage their decks"
  on public.decks for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

create table public.deck_cards (
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id text not null references public.cards (id),
  qty int not null check (qty > 0),
  primary key (deck_id, card_id)
);
alter table public.deck_cards enable row level security;

create policy "owners manage their deck cards"
  on public.deck_cards for all to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and d.owner = (select auth.uid())))
  with check (exists (select 1 from public.decks d where d.id = deck_id and d.owner = (select auth.uid())));

-- ───────── matches (written by the game server with the secret key) ─────────
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  p1 uuid not null references public.profiles (id),
  p2 uuid not null references public.profiles (id),
  winner uuid references public.profiles (id),
  turns int,
  played_at timestamptz not null default now()
);
alter table public.matches enable row level security;

create policy "players can read their own matches"
  on public.matches for select to authenticated
  using ((select auth.uid()) in (p1, p2));

-- ───────── card art storage (public read, no client writes) ─────────
insert into storage.buckets (id, name, public) values ('card-art', 'card-art', true)
on conflict (id) do nothing;
