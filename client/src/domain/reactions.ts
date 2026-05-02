import type { ForumPost } from '../types';

export function applyReactionToggle(
  post: ForumPost,
  reaction: 'like' | 'dislike',
): ForumPost {
  const removing = post.myReaction === reaction;
  let likes = post.likes;
  let dislikes = post.dislikes;
  let myReaction: 'like' | 'dislike' | null = reaction;

  if (removing) {
    if (reaction === 'like') likes -= 1;
    else dislikes -= 1;
    myReaction = null;
  } else if (post.myReaction) {
    if (reaction === 'like') {
      likes += 1;
      dislikes -= 1;
    } else {
      likes -= 1;
      dislikes += 1;
    }
  } else if (reaction === 'like') {
    likes += 1;
  } else {
    dislikes += 1;
  }

  return { ...post, likes, dislikes, myReaction };
}
