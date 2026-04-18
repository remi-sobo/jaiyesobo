alter table tasks add column completion_type text not null default 'photo'
  check (completion_type in ('photo', 'reflection', 'check', 'photo_and_reflection'));

alter table completions add column reflection text;

alter table tasks add column reflection_prompt text;
