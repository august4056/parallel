-- Reset existing objects (development convenience)
drop table if exists grades cascade;
drop table if exists submissions cascade;
drop table if exists assignments cascade;
drop table if exists users cascade;
drop type if exists submission_status cascade;
drop type if exists user_role cascade;

create extension if not exists "pgcrypto";

create type user_role as enum ('STUDENT', 'INSTRUCTOR');
create type submission_status as enum ('QUEUED', 'RUNNING', 'PASSED', 'FAILED');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role user_role not null default 'STUDENT',
  created_at timestamptz not null default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_at timestamptz not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  assignment_id uuid not null references assignments(id) on delete cascade,
  repo_url text not null,
  status submission_status not null default 'QUEUED',
  score numeric,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  rubric_json jsonb not null default '{}'::jsonb,
  total_score numeric not null,
  graded_at timestamptz not null default now()
);

create index idx_assignments_created_by on assignments(created_by);
create index idx_submissions_assignment on submissions(assignment_id);
create index idx_submissions_user on submissions(user_id);
create unique index idx_grades_submission on grades(submission_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_submissions_updated_at
  before update on submissions
  for each row
  execute function set_updated_at();
