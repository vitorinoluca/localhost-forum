import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { mergePostIntoList } from '../domain/forum-posts-state';
import type { ForumPost } from '../types';

type TrackedRequest = <T>(
  path: string,
  options?: RequestInit,
  settings?: { trackLoading?: boolean },
) => Promise<T>;

export function usePostDetailSync(
  postId: string | null,
  trackedApiRequest: TrackedRequest,
  setPosts: Dispatch<SetStateAction<ForumPost[]>>,
) {
  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await trackedApiRequest<{ post: ForumPost }>(
          `/api/forum/posts/${postId}`,
          undefined,
          { trackLoading: false },
        );
        if (cancelled) return;
        setPosts((prev) => mergePostIntoList(prev, data.post));
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, trackedApiRequest, setPosts]);
}
