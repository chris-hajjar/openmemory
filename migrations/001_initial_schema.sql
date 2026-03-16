-- Auto-update updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- memories: general notes, thoughts, things to remember
create table if not exists memories (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index memories_fts_idx on memories using gin(fts);
create index memories_tags_idx on memories using gin(tags);
create trigger memories_updated_at before update on memories
  for each row execute function update_updated_at();

-- tasks: project tasks/todos
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  project     text,
  status      text default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority    text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date    timestamptz,
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(project, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index tasks_fts_idx on tasks using gin(fts);
create index tasks_tags_idx on tasks using gin(tags);
create index tasks_project_idx on tasks(project);
create index tasks_status_idx on tasks(status);
create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();

-- finances: income/expense tracking
create table if not exists finances (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null,
  description text not null,
  category    text,
  date        date not null default current_date,
  tax_year    int generated always as (extract(year from date)::int) stored,
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index finances_fts_idx on finances using gin(fts);
create index finances_tags_idx on finances using gin(tags);
create index finances_tax_year_idx on finances(tax_year);
create index finances_date_idx on finances(date);
create trigger finances_updated_at before update on finances
  for each row execute function update_updated_at();

-- portfolio_notes: trading ideas, stock theses, market observations
create table if not exists portfolio_notes (
  id          uuid primary key default gen_random_uuid(),
  ticker      text,
  title       text not null,
  content     text not null,
  note_type   text default 'observation' check (note_type in ('thesis', 'observation', 'trade_idea', 'research', 'other')),
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(ticker, '') || ' ' || coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index portfolio_notes_fts_idx on portfolio_notes using gin(fts);
create index portfolio_notes_tags_idx on portfolio_notes using gin(tags);
create index portfolio_notes_ticker_idx on portfolio_notes(ticker);
create trigger portfolio_notes_updated_at before update on portfolio_notes
  for each row execute function update_updated_at();

-- schedule: events and important dates
create table if not exists schedule (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_date  timestamptz not null,
  end_date    timestamptz,
  all_day     boolean default false,
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index schedule_fts_idx on schedule using gin(fts);
create index schedule_tags_idx on schedule using gin(tags);
create index schedule_event_date_idx on schedule(event_date);
create trigger schedule_updated_at before update on schedule
  for each row execute function update_updated_at();

-- tax_records: tax document metadata, deductions, yearly records
create table if not exists tax_records (
  id          uuid primary key default gen_random_uuid(),
  tax_year    int not null,
  record_type text not null check (record_type in ('document', 'deduction', 'income', 'credit', 'note')),
  title       text not null,
  description text,
  amount      numeric(12, 2),
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index tax_records_fts_idx on tax_records using gin(fts);
create index tax_records_tags_idx on tax_records using gin(tags);
create index tax_records_tax_year_idx on tax_records(tax_year);
create trigger tax_records_updated_at before update on tax_records
  for each row execute function update_updated_at();

-- contacts: people and companies
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  company     text,
  role        text,
  notes       text,
  tags        text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  fts         tsvector generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(company, '') || ' ' || coalesce(role, '') || ' ' || coalesce(notes, '') || ' ' || coalesce(array_to_string(tags, ' '), ''))
  ) stored
);
create index contacts_fts_idx on contacts using gin(fts);
create index contacts_tags_idx on contacts using gin(tags);
create trigger contacts_updated_at before update on contacts
  for each row execute function update_updated_at();

-- RPC: get_table_schema — returns column info for a given table
create or replace function get_table_schema(p_table_name text)
returns table(column_name text, data_type text, is_nullable text, column_default text)
language sql security definer as $$
  select
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table_name
  order by c.ordinal_position;
$$;
