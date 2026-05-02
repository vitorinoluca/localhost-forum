create table if not exists forum_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists forum_post_reactions_post_id_idx
  on forum_post_reactions(post_id);

create index if not exists forum_post_reactions_user_id_idx
  on forum_post_reactions(user_id);

create table if not exists forum_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forum_post_comments_post_id_idx
  on forum_post_comments(post_id, created_at asc);
