-- Add 'lesson' as a new completion_type
alter table tasks drop constraint if exists tasks_completion_type_check;
alter table tasks add constraint tasks_completion_type_check
  check (completion_type in ('photo', 'reflection', 'check', 'photo_and_reflection', 'lesson'));

-- Link a task to a lesson module by slug
alter table tasks add column if not exists lesson_slug text;

-- Store the kid's answers as structured JSON
alter table completions add column if not exists lesson_responses jsonb;
