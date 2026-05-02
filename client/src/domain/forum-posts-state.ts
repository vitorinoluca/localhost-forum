import type { ForumPost } from '../types';

export function mergePostIntoList(posts: ForumPost[], post: ForumPost): ForumPost[] {
  const without = posts.filter((p) => p.id !== post.id);
  return [post, ...without];
}
