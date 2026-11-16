/*
  Migration 032: the welcome email.

  sb_email_log.kind gains 'welcome'. It is sent once, right after an address
  is confirmed, and logged with dedupe_key 'welcome' so the unique
  (subscriber_id, dedupe_key) index stops a second one.
*/

alter table sb_email_log drop constraint if exists sb_email_log_kind_check;
alter table sb_email_log add constraint sb_email_log_kind_check
  check (kind in ('confirm', 'consent', 'results', 'newsletter', 'login', 'welcome'));
