create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_player_id uuid,
  status text not null default 'lobby',
  game jsonb,
  created_via_api boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  token text not null,
  created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);
grant all on public.rooms, public.players, public.messages, public.api_keys to service_role;
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.messages enable row level security;
alter table public.api_keys enable row level security;
create index on public.players(room_id);
create index on public.messages(room_id, created_at);