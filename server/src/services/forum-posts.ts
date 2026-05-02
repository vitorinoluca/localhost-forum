import { pool } from '../db/pool.js';

type AttachmentRow = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  created_at: Date | string;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: Date | string;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
};

type PostRow = {
  id: string;
  title: string;
  body: string;
  created_at: Date;
  updated_at: Date;
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  attachments: AttachmentRow[] | null;
  comments: CommentRow[] | null;
  likes_count: number;
  dislikes_count: number;
  my_reaction: 'like' | 'dislike' | null;
};

const FORUM_POST_SELECT = `
  select
    p.id,
    p.title,
    p.body,
    p.created_at,
    p.updated_at,
    u.id as author_id,
    u.name as author_name,
    u.avatar_url as author_avatar_url,
    coalesce(
      (
        select json_agg(attachment_row order by (attachment_row->>'created_at')::timestamptz asc)
        from (
          select json_build_object(
            'id', a.id,
            'original_name', a.original_name,
            'mime_type', a.mime_type,
            'size_bytes', a.size_bytes,
            'url', a.url,
            'created_at', a.created_at
          ) as attachment_row
          from forum_post_attachments a
          where a.post_id = p.id
        ) attachments
      ),
      '[]'::json
    ) as attachments,
    coalesce(
      (
        select json_agg(comment_row order by (comment_row->>'created_at')::timestamptz asc)
        from (
          select json_build_object(
            'id', c.id,
            'body', c.body,
            'created_at', c.created_at,
            'author_id', cu.id,
            'author_name', cu.name,
            'author_avatar_url', cu.avatar_url
          ) as comment_row
          from forum_post_comments c
          join users cu on cu.id = c.user_id
          where c.post_id = p.id
        ) comments
      ),
      '[]'::json
    ) as comments,
    (
      select count(*)::int
      from forum_post_reactions r
      where r.post_id = p.id and r.reaction_type = 'like'
    ) as likes_count,
    (
      select count(*)::int
      from forum_post_reactions r
      where r.post_id = p.id and r.reaction_type = 'dislike'
    ) as dislikes_count,
    (
      select r.reaction_type
      from forum_post_reactions r
      where r.post_id = p.id and r.user_id = $1
      limit 1
    ) as my_reaction
  from forum_posts p
  join users u on u.id = p.user_id
`;

function toIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRowToForumPost(row: PostRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: {
      id: row.author_id,
      name: row.author_name,
      avatarUrl: row.author_avatar_url,
    },
    attachments: (row.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      originalName: attachment.original_name,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes,
      url: attachment.url,
      createdAt: toIsoDate(attachment.created_at),
    })),
    comments: (row.comments ?? []).map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: toIsoDate(comment.created_at),
      author: {
        id: comment.author_id,
        name: comment.author_name,
        avatarUrl: comment.author_avatar_url,
      },
    })),
    likes: Number(row.likes_count ?? 0),
    dislikes: Number(row.dislikes_count ?? 0),
    myReaction: row.my_reaction ?? null,
  };
}

export async function listForumPostsForViewer(userId: string | null) {
  const result = await pool.query<PostRow>(
    `${FORUM_POST_SELECT}
      order by p.created_at desc
      limit 100`,
    [userId],
  );
  return result.rows.map(mapRowToForumPost);
}

export async function getForumPostForViewer(userId: string | null, postId: string) {
  const result = await pool.query<PostRow>(
    `${FORUM_POST_SELECT}
      where p.id = $2
      limit 1`,
    [userId, postId],
  );
  const row = result.rows[0];
  return row ? mapRowToForumPost(row) : null;
}
