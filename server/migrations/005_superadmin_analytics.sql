alter table users add column if not exists role text not null default 'user'
  constraint users_role_check check (role in ('user', 'superadmin'));
alter table users add column if not exists banned_at timestamptz;
alter table users add column if not exists ban_reason text;

update forum_post_attachments set moderation_status = 'approved' where moderation_status = 'pending';
update forum_posts set moderation_pending = false where moderation_pending = true;

create table if not exists ip_bans (
  id uuid primary key default gen_random_uuid(),
  cidr cidr not null unique,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id) on delete set null
);

create index if not exists ip_bans_created_at_idx on ip_bans (created_at desc);

create table if not exists analytics_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  referrer text,
  country_code char(2),
  region text,
  city text,
  user_agent text,
  user_id uuid references users(id) on delete set null
);

create index if not exists analytics_visits_created_at_idx on analytics_visits (created_at desc);
create index if not exists analytics_visits_country_idx on analytics_visits (country_code);
create index if not exists analytics_visits_user_idx on analytics_visits (user_id);
