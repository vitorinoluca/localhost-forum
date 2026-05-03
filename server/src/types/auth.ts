import type { Request } from 'express';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  bio: string | null;
  avatarUrl: string | null;
  role: 'user' | 'superadmin';
};

export type AuthenticatedRequest = Request & {
  auth?: {
    user: PublicUser;
  };
};
