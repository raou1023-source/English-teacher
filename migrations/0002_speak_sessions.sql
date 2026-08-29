create table if not exists speak_sessions (
  id text not null,
  user_id text not null,
  title text not null,
  scenario text not null,
  character_id text not null,
  drill text not null,
  turns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists speak_sessions_user_updated_idx
  on speak_sessions (user_id, updated_at desc);
