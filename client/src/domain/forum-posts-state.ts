import type { ForumPost } from '../types';

/** Evita `.length` sobre undefined si la API o un proxy devuelve datos incompletos. */
export function normalizeForumPost(post: ForumPost): ForumPost {
  return {
    ...post,
    attachments: Array.isArray(post.attachments) ? post.attachments : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
  };
}

export function normalizeForumPosts(posts: unknown): ForumPost[] {
  if (!Array.isArray(posts)) return [];
  return posts.map((p) => normalizeForumPost(p as ForumPost));
}

export function mergePostIntoList(posts: ForumPost[] | undefined, post: ForumPost): ForumPost[] {
  const list = Array.isArray(posts) ? posts : [];
  const normalized = normalizeForumPost(post);
  const without = list.filter((p) => p.id !== normalized.id);
  return [normalized, ...without];
}
