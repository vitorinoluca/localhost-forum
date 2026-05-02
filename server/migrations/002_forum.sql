create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_posts_created_at_idx
  on forum_posts(created_at desc);

create table if not exists forum_post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_post_attachments_post_id_idx
  on forum_post_attachments(post_id);
