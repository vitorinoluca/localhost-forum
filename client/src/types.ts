import type { AuthUser } from './api';

export type KnownRoute =
  | '/'
  | '/login'
  | '/register'
  | '/verify-email'
  | '/app'
  | '/profile/edit'
  | '/admin'
  | '/notifications'
  | '/terms'
  | '/privacy'
  | '/contact';
export type Route = KnownRoute | `/posts/${string}` | `/users/${string}`;

export type AuthPayload = {
  user?: AuthUser;
  message?: string;
  status?: string;
  nextPath?: Route;
  emailMasked?: string;
  devCode?: string;
};

export type ForumAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

export type ForumPost = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  attachments: ForumAttachment[];
  likes: number;
  dislikes: number;
  myReaction: 'like' | 'dislike' | null;
  comments: ForumComment[];
};

export type ForumComment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

export type PublicProfile = {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  postsCount: number;
};

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkPath: string;
  readAt: string | null;
  createdAt: string;
  postId: string | null;
  actor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};
