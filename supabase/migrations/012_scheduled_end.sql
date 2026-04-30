-- Add a kid-chosen end time so he can extend a task beyond its admin-set floor.
-- estimated_minutes stays as the FLOOR (minimum). scheduled_end_time is what he
-- actually picked. Effective end = scheduled_end_time OR scheduled_time + floor.

alter table tasks add column if not exists scheduled_end_time time;
