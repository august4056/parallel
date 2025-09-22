alter table assignments enable row level security;
alter table submissions enable row level security;
alter table grades enable row level security;

create policy "Public read assignments" on assignments
  for select
  using (true);

create policy "Instructors manage assignments" on assignments
  for all
  using ((auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR')
  with check ((auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR');

create policy "Students insert submissions" on submissions
  for insert
  with check (auth.uid() = user_id);

create policy "Students view own submissions" on submissions
  for select
  using (auth.uid() = user_id);

create policy "Students update own submissions" on submissions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Instructors manage submissions" on submissions
  for all
  using ((auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR')
  with check ((auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR');

create policy "Instructors manage grades" on grades
  for all
  using ((auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR')
  with check ((auth.jwt() ->> 'role')::user_role = 'INSTRUCTOR');

create policy "Students read own grades" on grades
  for select
  using (
    exists (
      select 1
      from submissions s
      where s.id = grades.submission_id
        and s.user_id = auth.uid()
    )
  );
