-- Matches in progress, saved by the game server after every change, so a restart of the server (a deploy) doesn't end them.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query > paste > Run).
-- Only the game server uses it, with the secret key. There are no policies on purpose: a saved match holds both
-- players' hidden cards and the room password, so signed-in users can't read it.

create table if not exists public.live_matches (
  room_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.live_matches enable row level security;
