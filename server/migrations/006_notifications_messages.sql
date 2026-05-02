-- Notificaciones in-app (ej. comentario en tu publicacion)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null constraint notifications_type_check check (type in ('comment_on_post')),
  title text not null,
  body text,
  link_path text not null,
  actor_user_id uuid references users(id) on delete set null,
  post_id uuid references forum_posts(id) on delete cascade,
  comment_id uuid references forum_post_comments(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);
