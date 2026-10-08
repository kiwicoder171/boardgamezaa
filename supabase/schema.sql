-- BoardgameZaa: Supabase Multiplayer Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

create table if not exists public.rooms (
  code text primary key,
  host_id text not null,
  selected_game_id text not null,
  status text not null default 'lobby',
  game_settings jsonb not null default '{}'::jsonb,
  game_state jsonb,
  players jsonb not null default '[]'::jsonb,
  chat_messages jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  last_activity bigint not null
);

-- Indexes for performance
create index if not exists idx_rooms_last_activity on public.rooms (last_activity desc);

-- Enable Row Level Security (RLS)
alter table public.rooms enable row level security;

-- Drop previous policies if re-running
drop policy if exists "Allow read on rooms" on public.rooms;
drop policy if exists "Allow insert on rooms" on public.rooms;
drop policy if exists "Allow update on rooms" on public.rooms;
drop policy if exists "Allow delete on rooms" on public.rooms;

-- Tabletop rooms are open for public and invite joins
create policy "Allow read on rooms" on public.rooms 
  for select to anon, authenticated 
  using (true);

create policy "Allow insert on rooms" on public.rooms 
  for insert to anon, authenticated 
  with check (true);

create policy "Allow update on rooms" on public.rooms 
  for update to anon, authenticated 
  using (true) 
  with check (true);

create policy "Allow delete on rooms" on public.rooms 
  for delete to anon, authenticated 
  using (true);

-- Enable Realtime publication for the rooms table
alter publication supabase_realtime add table public.rooms;
