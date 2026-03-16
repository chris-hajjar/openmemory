-- OAuth sessions: stores PKCE auth codes and issued tokens
create table if not exists oauth_sessions (
  id               uuid primary key default gen_random_uuid(),
  google_email     text not null,
  access_token     text not null unique,
  refresh_token    text not null unique,
  code             text unique,
  code_expires_at  timestamptz,
  token_expires_at timestamptz not null,
  created_at       timestamptz default now()
);

create index oauth_sessions_access_token_idx on oauth_sessions(access_token);
create index oauth_sessions_refresh_token_idx on oauth_sessions(refresh_token);
create index oauth_sessions_code_idx on oauth_sessions(code);

-- OAuth PKCE state: stores state/code_challenge during authorization flow
create table if not exists oauth_pkce_state (
  state             text primary key,
  code_challenge    text not null,
  redirect_uri      text not null,
  client_id         text not null,
  created_at        timestamptz default now(),
  expires_at        timestamptz default (now() + interval '10 minutes')
);

create index oauth_pkce_state_expires_idx on oauth_pkce_state(expires_at);
