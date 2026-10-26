-- Friends and nicknames. Run once in the Supabase SQL editor
-- (Dashboard > SQL Editor > New query > paste > Run). Safe to run again.

-- ───────── nicknames and picture version (shown to friends and opponents) ─────────
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists avatar_v bigint; -- set by the website when a picture is saved
alter table public.profiles drop constraint if exists profiles_nickname_check;
alter table public.profiles add constraint profiles_nickname_check check (nickname is null or char_length(nickname) between 1 and 24);

-- A player may change only their own nickname: never the username, the picture version or anyone else's row.
revoke update on public.profiles from anon, authenticated;
grant update (nickname) on public.profiles to authenticated;
drop policy if exists "players change their own nickname" on public.profiles;
create policy "players change their own nickname"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- searching for people by name
create index if not exists profiles_username_trgm on public.profiles using gin (username extensions.gin_trgm_ops);
create index if not exists profiles_nickname_trgm on public.profiles using gin (nickname extensions.gin_trgm_ops);

-- ───────── friendships ─────────
-- One row per pair. "pending": the requester asked, the addressee has not answered. "accepted": they are friends.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

-- a pair can only be linked once, whichever of them asked first
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_requester_idx on public.friendships (requester);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

revoke all on public.friendships from anon;
revoke update on public.friendships from authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated; -- accepting is the only change anyone can make

drop policy if exists "see your own friendships" on public.friendships;
create policy "see your own friendships"
  on public.friendships for select to authenticated
  using (requester = (select auth.uid()) or addressee = (select auth.uid()));

drop policy if exists "send a friend request" on public.friendships;
create policy "send a friend request"
  on public.friendships for insert to authenticated
  with check (requester = (select auth.uid()) and status = 'pending');

drop policy if exists "accept a request sent to you" on public.friendships;
create policy "accept a request sent to you"
  on public.friendships for update to authenticated
  using (addressee = (select auth.uid()) and status = 'pending')
  with check (addressee = (select auth.uid()) and status = 'accepted');

-- unfriend, decline or cancel: either person can remove the row
drop policy if exists "remove a friendship you are in" on public.friendships;
create policy "remove a friendship you are in"
  on public.friendships for delete to authenticated
  using (requester = (select auth.uid()) or addressee = (select auth.uid()));

-- limits, so one account can't spam requests or hoard links
create or replace function public.limit_friend_requests()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.friendships where requester = new.requester and status = 'pending') >= 50 then
    raise exception 'You have too many requests waiting. Wait for answers or cancel some.';
  end if;
  if (select count(*) from public.friendships where requester = new.requester or addressee = new.requester) >= 300 then
    raise exception 'Your friends list is full.';
  end if;
  return new;
end;
$$;
drop trigger if exists limit_friend_requests on public.friendships;
create trigger limit_friend_requests before insert on public.friendships for each row execute function public.limit_friend_requests();
