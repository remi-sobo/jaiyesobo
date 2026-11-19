/*
  Migration 029: a final week's recap stays editable.

  Migration 025 froze a final week completely. The recap is editorial text
  (written by the AI after the week closes, or by Remi in the admin), and
  since weeks now finalize themselves as soon as every pick has a result,
  the recap usually arrives after the freeze. This keeps every other column
  locked and lets only `recap` (and `updated_at`) change on a final week.
*/

create or replace function sb_weeks_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'final' then
      raise exception 'sb_weeks: a final week is locked' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.status = 'final' then
    -- Only the recap may change once a week is final.
    if row(new.id, new.season, new.week_number, new.starts_on, new.ends_on, new.status, new.finalized_at, new.created_at)
       is distinct from
       row(old.id, old.season, old.week_number, old.starts_on, old.ends_on, old.status, old.finalized_at, old.created_at) then
      raise exception 'sb_weeks: a final week is locked' using errcode = 'P0001';
    end if;
  end if;
  if new.status = 'final' and new.finalized_at is null then
    new.finalized_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
