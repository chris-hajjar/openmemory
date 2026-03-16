create table oauth_clients (
  client_id        text primary key default gen_random_uuid()::text,
  client_name      text,
  redirect_uris    text[] not null,
  grant_types      text[] default '{authorization_code,refresh_token}',
  response_types   text[] default '{code}',
  token_endpoint_auth_method text default 'none',
  scope            text default 'mcp',
  created_at       timestamptz default now()
);
