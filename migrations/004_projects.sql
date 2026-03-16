create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text default 'active',
  priority    text default 'medium',
  tags        text[],
  due_date    timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
                to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
              ) stored
);

create index projects_fts_idx on projects using gin(fts);
create index projects_tags_idx on projects using gin(tags);
create index projects_status_idx on projects(status);

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();
