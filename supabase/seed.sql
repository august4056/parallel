insert into users (id, email, role)
values
  ('11111111-1111-1111-1111-111111111111', 'instructor@example.com', 'INSTRUCTOR'),
  ('22222222-2222-2222-2222-222222222222', 'student@example.com', 'STUDENT')
on conflict (id) do nothing;

insert into assignments (id, title, description, due_at, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Intro to Cloud Runtimes',
  'Deploy a hello-world Cloudflare Worker with Supabase integration.',
  now() + interval '7 days',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into submissions (id, user_id, assignment_id, repo_url, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'https://github.com/example/launchpad-lab-solution',
  'QUEUED'
)
on conflict (id) do nothing;

insert into grades (id, submission_id, rubric_json, total_score, graded_at)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '{"tests": [], "summary": "Not yet graded"}',
  0,
  now()
)
on conflict (submission_id) do nothing;
