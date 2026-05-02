create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  name text not null,
  password_hash text not null,
  email_verified_at timestamptz,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_user_active_idx
  on email_verification_codes(user_id, expires_at desc)
  where consumed_at is null;

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  ip_address inet,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_user_active_idx
  on user_sessions(user_id, expires_at desc)
  where revoked_at is null;
