-- Migration: initial schema for classroom workflows
begin;

create extension if not exists "pgcrypto" with schema public;

create type user_role as enum ('STUDENT', 'INSTRUCTOR');
create type submission_status as enum ('PENDING', 'SUBMITTED', 'GRADED');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role user_role not null default 'STUDENT',
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_at timestamptz,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  repo_url text not null,
  status submission_status not null default 'PENDING',
  feedback text,
  score numeric,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  total_score numeric not null,
  rubric jsonb not null default '{}'::jsonb,
  graded_by uuid not null references public.users(id) on delete cascade,
  graded_at timestamptz not null default now()
);

create index idx_assignments_created_by on public.assignments (created_by);
create index idx_submissions_assignment on public.submissions (assignment_id);
create index idx_submissions_user on public.submissions (user_id);
create unique index idx_grades_submission on public.grades (submission_id);

create or replace function public.set_submission_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_submission_updated_at
  before update on public.submissions
  for each row
  execute function public.set_submission_updated_at();

alter table public.users enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.grades enable row level security;

-- Users table policies: each authenticated user can read their profile
create policy "Users can view self" on public.users
  for select
  using (auth.uid() = id);

-- Assignments are public to read, but only instructors can manage their own
create policy "Assignments are readable" on public.assignments
  for select
  using (true);

create policy "Instructors manage own assignments" on public.assignments
  for insert
  with check (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and created_by = auth.uid()
  );

create policy "Instructors update own assignments" on public.assignments
  for update using (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and created_by = auth.uid()
  ) with check (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and created_by = auth.uid()
  );

create policy "Instructors delete own assignments" on public.assignments
  for delete using (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and created_by = auth.uid()
  );

-- Students can only interact with their own submissions
create policy "Students insert own submissions" on public.submissions
  for insert
  with check (auth.uid() = user_id);

create policy "Students view own submissions" on public.submissions
  for select
  using (auth.uid() = user_id);

create policy "Students update own submissions" on public.submissions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Instructors can view and manage submissions for assignments they authored
create policy "Instructors view assignment submissions" on public.submissions
  for select
  using (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and exists (
      select 1
      from public.assignments a
      where a.id = public.submissions.assignment_id
        and a.created_by = auth.uid()
    )
  );

create policy "Instructors update assignment submissions" on public.submissions
  for update using (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and exists (
      select 1
      from public.assignments a
      where a.id = public.submissions.assignment_id
        and a.created_by = auth.uid()
    )
  ) with check (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and exists (
      select 1
      from public.assignments a
      where a.id = public.submissions.assignment_id
        and a.created_by = auth.uid()
    )
  );

-- Students can only view grades tied to their submissions
create policy "Students view own grades" on public.grades
  for select
  using (
    exists (
      select 1
      from public.submissions s
      where s.id = public.grades.submission_id
        and s.user_id = auth.uid()
    )
  );

-- Instructors can view and manage grades for assignments they authored
create policy "Instructors view assignment grades" on public.grades
  for select
  using (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and exists (
      select 1
      from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = public.grades.submission_id
        and a.created_by = auth.uid()
    )
  );

create policy "Instructors manage assignment grades" on public.grades
  for all using (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and exists (
      select 1
      from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = public.grades.submission_id
        and a.created_by = auth.uid()
    )
  ) with check (
    (auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR'
    and exists (
      select 1
      from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      where s.id = public.grades.submission_id
        and a.created_by = auth.uid()
    )
  );

commit;
