insert into public.users (id, email, full_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'instructor1@example.com', 'Instructor Ichiro', 'INSTRUCTOR'),
  ('22222222-2222-2222-2222-222222222222', 'student1@example.com', 'Student Hanako', 'STUDENT'),
  ('33333333-3333-3333-3333-333333333333', 'student2@example.com', 'Student Taro', 'STUDENT')
on conflict (id) do nothing;

insert into public.assignments (id, title, description, due_at, created_by)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Supabase Starter Assignment',
    'Fork the template repo and connect it to your Supabase project.',
    now() + interval '7 days',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

insert into public.submissions (id, user_id, assignment_id, repo_url, status, feedback, score)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'https://github.com/student1/assignment',
    'SUBMITTED',
    null,
    null
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'https://github.com/student2/assignment',
    'PENDING',
    null,
    null
  )
on conflict (id) do nothing;

insert into public.grades (id, submission_id, total_score, rubric, graded_by, graded_at)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    85,
    '{"criteria": [{"name": "Build", "score": 40}, {"name": "Docs", "score": 45}], "comment": "Great start"}',
    '11111111-1111-1111-1111-111111111111',
    now()
  )
on conflict (submission_id) do nothing;
