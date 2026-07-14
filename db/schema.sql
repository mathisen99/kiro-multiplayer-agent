pragma foreign_keys = on;

create table if not exists rooms (
  id text primary key,
  name text not null,
  goal text not null default '',
  rough_idea text not null default '',
  final_title text,
  final_markdown text,
  created_at text not null,
  updated_at text not null
) strict;

create table if not exists participants (
  id text primary key,
  room_id text not null references rooms(id) on delete cascade,
  client_id text,
  participant_type text not null check (participant_type in ('human', 'agent')),
  display_name text not null,
  agent_role text check (agent_role in ('product', 'critic', 'engineer', 'ux', 'growth')),
  created_at text not null,
  last_seen_at text not null,
  unique(room_id, client_id)
) strict;

create table if not exists cards (
  id text primary key,
  room_id text not null references rooms(id) on delete cascade,
  section text not null check (section in ('problem', 'requirements', 'risks', 'tasks')),
  title text not null,
  content text not null default '',
  status text not null check (status in ('active', 'proposed', 'approved', 'rejected')) default 'active',
  author_type text not null check (author_type in ('human', 'agent')),
  author_name text not null,
  agent_role text check (agent_role in ('product', 'critic', 'engineer', 'ux', 'growth')),
  rationale text,
  source_card_ids_json text not null default '[]',
  created_at text not null,
  updated_at text not null
) strict;

create table if not exists agent_runs (
  id text primary key,
  room_id text not null references rooms(id) on delete cascade,
  participant_id text not null references participants(id) on delete cascade,
  instruction text not null default '',
  status text not null check (status in ('running', 'completed', 'failed')),
  summary text,
  error_message text,
  created_at text not null,
  completed_at text
) strict;

create index if not exists participants_room_id_idx on participants(room_id);
create index if not exists cards_room_id_idx on cards(room_id);
create index if not exists agent_runs_room_id_idx on agent_runs(room_id);
