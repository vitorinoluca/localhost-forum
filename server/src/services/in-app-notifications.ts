import { pool } from '../db/pool.js';

function truncate(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function notifyPostAuthorOfComment(options: {
  postAuthorId: string;
  commenterId: string;
  commenterName: string;
  postId: string;
  postTitle: string;
  commentId: string;
}) {
  if (options.postAuthorId === options.commenterId) {
    return;
  }

  const title = 'Nuevo comentario';
  const body = `${options.commenterName} comentó en «${truncate(options.postTitle, 52)}»`;
  const linkPath = `/posts/${options.postId}`;

  await pool.query(
    `
      insert into notifications
        (user_id, type, title, body, link_path, actor_user_id, post_id, comment_id)
      values
        ($1, 'comment_on_post', $2, $3, $4, $5, $6, $7)
    `,
    [
      options.postAuthorId,
      title,
      body,
      linkPath,
      options.commenterId,
      options.postId,
      options.commentId,
    ],
  );
}
