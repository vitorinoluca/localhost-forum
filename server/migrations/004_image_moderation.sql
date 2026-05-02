alter table forum_posts add column if not exists moderation_pending boolean not null default false;

alter table forum_post_attachments add column if not exists storage_path text;
alter table forum_post_attachments add column if not exists moderation_status text;

update forum_post_attachments
set storage_path = 'forum/' || post_id::text || '/' || stored_name
where storage_path is null;

update forum_post_attachments
set moderation_status = 'approved'
where moderation_status is null;

alter table forum_post_attachments alter column storage_path set not null;
alter table forum_post_attachments alter column moderation_status set not null;

alter table forum_post_attachments drop constraint if exists forum_post_attachments_moderation_status_check;

alter table forum_post_attachments add constraint forum_post_attachments_moderation_status_check
  check (moderation_status in ('pending', 'approved', 'rejected'));
