import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest, type AuthUser } from '../api';
import { applyReactionToggle } from '../domain/reactions';
import { mergePostIntoList } from '../domain/forum-posts-state';
import { getRoute, parsePostDetailUuid } from '../lib/route';
import { usePostDetailSync } from './usePostDetailSync';
import type { AuthPayload, ForumPost, PublicProfile, Route } from '../types';
import {
  emptyRegisterFieldErrors,
  parseRegisterFields,
  type RegisterFieldErrorsState,
} from '../utils/register-fields';
import { getIssues } from '../utils/issues';

export function useAppController() {
  const [route, setRoute] = useState<Route>(() => getRoute());
  const [user, setUser] = useState<AuthUser | null>(null);
  const userRef = useRef(user);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [message, setMessage] = useState('');
  const [devCode, setDevCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [forumLoading, setForumLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postImages, setPostImages] = useState<FileList | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loginFieldError, setLoginFieldError] = useState(false);
  const [registerFieldErrors, setRegisterFieldErrors] = useState<RegisterFieldErrorsState>(
    () => emptyRegisterFieldErrors(),
  );
  const [verifyCodeError, setVerifyCodeError] = useState(false);
  const verificationBootedRef = useRef(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileEditMessage, setProfileEditMessage] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileRemoveAvatar, setProfileRemoveAvatar] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const clearAuthFieldFeedback = useCallback(() => {
    setLoginFieldError(false);
    setRegisterFieldErrors(emptyRegisterFieldErrors());
    setVerifyCodeError(false);
  }, []);

  const applyRoute = useCallback(
    (nextRoute: Route) => {
      clearAuthFieldFeedback();
      setRoute(nextRoute);
    },
    [clearAuthFieldFeedback],
  );

  useEffect(() => {
    const onPopState = () => applyRoute(getRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyRoute]);

  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/app') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const trackedApiRequest = useCallback(
    async <T,>(
      path: string,
      options?: RequestInit,
      settings: { trackLoading?: boolean } = {},
    ) => {
      const trackLoading = settings.trackLoading ?? true;
      if (trackLoading) setPendingRequests((c) => c + 1);
      try {
        return await apiRequest<T>(path, options);
      } finally {
        if (trackLoading) setPendingRequests((c) => Math.max(0, c - 1));
      }
    },
    [],
  );

  const runAuthAction = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    setAuthLoading(true);
    setMessage('');
    try {
      await action();
      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        const issues = getIssues(error.data);
        setMessage(issues.length ? issues.join(' ') : error.message);
      } else {
        setMessage('Ocurrio un error inesperado.');
      }
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const clearLoginFeedback = useCallback(() => {
    setLoginFieldError(false);
    setMessage('');
  }, []);

  const setLoginEmail = useCallback(
    (value: string) => {
      clearLoginFeedback();
      setEmail(value);
    },
    [clearLoginFeedback],
  );

  const setLoginPassword = useCallback(
    (value: string) => {
      clearLoginFeedback();
      setPassword(value);
    },
    [clearLoginFeedback],
  );

  const setRegisterName = useCallback((value: string) => {
    setRegisterFieldErrors((prev) => ({ ...prev, name: false }));
    setMessage('');
    setName(value);
  }, []);

  const setRegisterEmail = useCallback((value: string) => {
    setRegisterFieldErrors((prev) => ({ ...prev, email: false }));
    setMessage('');
    setEmail(value);
  }, []);

  const setRegisterPassword = useCallback((value: string) => {
    setRegisterFieldErrors((prev) => ({ ...prev, password: false }));
    setMessage('');
    setPassword(value);
  }, []);

  const clearVerifyFeedback = useCallback(() => {
    setVerifyCodeError(false);
    setMessage('');
  }, []);

  const setVerifyCodeField = useCallback(
    (value: string) => {
      clearVerifyFeedback();
      setCode(value);
    },
    [clearVerifyFeedback],
  );

  const loadPosts = useCallback(
    async (silent = false) => {
      if (!silent) setForumLoading(true);
      try {
        const data = await trackedApiRequest<{ posts: ForumPost[] }>(
          '/api/forum/posts',
          undefined,
          { trackLoading: !silent },
        );
        setPosts(data.posts);
      } catch (error) {
        if (error instanceof ApiError) setMessage(error.message);
      } finally {
        if (!silent) setForumLoading(false);
      }
    },
    [trackedApiRequest],
  );

  useEffect(() => {
    apiRequest<{ user: AuthUser }>('/api/auth/me')
      .then((data) => {
        setUser(data.user);
        const p = getRoute();
        if (p === '/login' || p === '/register' || p === '/verify-email') {
          window.history.pushState({}, '', '/');
          applyRoute('/');
        }
      })
      .catch(async () => {
        setUser(null);
        if (getRoute() !== '/') return;
        try {
          const reg = await apiRequest<AuthPayload>('/api/auth/registration-state');
          if (reg.status === 'verification_required') {
            window.history.pushState({}, '', '/verify-email');
            applyRoute('/verify-email');
          }
        } catch {
          return;
        }
      })
      .finally(() => setCheckingSession(false));
  }, [applyRoute]);

  useEffect(() => {
    if (route !== '/verify-email' || user || verificationBootedRef.current) return;
    verificationBootedRef.current = true;
    void runAuthAction(async () => {
      const state = await apiRequest<AuthPayload>('/api/auth/registration-state');
      setEmailMasked(state.emailMasked ?? '');
      const data = await apiRequest<AuthPayload>('/api/auth/send-verification', {
        method: 'POST',
      });
      setEmailMasked(data.emailMasked ?? state.emailMasked ?? '');
      setDevCode(data.devCode ?? '');
      setMessage(data.message ?? 'Codigo enviado.');
    });
  }, [route, runAuthAction, user]);

  useEffect(() => {
    if (route !== '/') return;
    void Promise.resolve().then(() => loadPosts());
  }, [loadPosts, route]);

  const isPostDetail = route.startsWith('/posts/');
  const detailPostId = isPostDetail ? route.slice('/posts/'.length) : null;
  const detailPostUuid = parsePostDetailUuid(route);

  usePostDetailSync(detailPostUuid, trackedApiRequest, setPosts);

  const navigate = useCallback(
    (nextRoute: Route) => {
      if (
        user &&
        (nextRoute === '/login' || nextRoute === '/register' || nextRoute === '/verify-email')
      ) {
        window.history.pushState({}, '', '/');
        applyRoute('/');
        setMessage('');
        setDevCode('');
        return;
      }
      window.history.pushState({}, '', nextRoute);
      applyRoute(nextRoute);
      setMessage('');
      setDevCode('');
    },
    [applyRoute, user],
  );

  useEffect(() => {
    if (checkingSession || route !== '/admin') return;
    if (!user) {
      queueMicrotask(() => navigate('/login'));
      return;
    }
    if (user.role !== 'superadmin') {
      queueMicrotask(() => navigate('/'));
    }
  }, [checkingSession, route, user, navigate]);

  useEffect(() => {
    if (checkingSession) return;
    if (!user && route === '/notifications') {
      queueMicrotask(() => navigate('/login'));
    }
  }, [checkingSession, route, user, navigate]);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      clearAuthFieldFeedback();
      setMessage('');
      setAuthLoading(true);
      try {
        const data = await trackedApiRequest<{ user: AuthUser }>('/api/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        });
        setUser(data.user);
        navigate('/');
      } catch (error) {
        if (error instanceof ApiError) {
          setMessage(error.message);
        } else {
          setMessage('Ocurrio un error inesperado.');
        }
      } finally {
        setAuthLoading(false);
      }
    },
    [clearAuthFieldFeedback, navigate, trackedApiRequest],
  );

  const profileUserId =
    route.startsWith('/users/') && route.length > '/users/'.length
      ? route.slice('/users/'.length)
      : null;

  useEffect(() => {
    if (!profileUserId) {
      queueMicrotask(() => {
        setPublicProfile(null);
        setProfileError('');
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setProfileLoading(true);
        setProfileError('');
      }
    });

    void apiRequest<{ profile: PublicProfile }>(`/api/users/${profileUserId}`)
      .then((data) => {
        if (!cancelled) setPublicProfile(data.profile);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPublicProfile(null);
          setProfileError(
            error instanceof ApiError ? error.message : 'No se pudo cargar el perfil.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  useEffect(() => {
    if (route !== '/profile/edit' || checkingSession || user) return;
    queueMicrotask(() => navigate('/login'));
  }, [checkingSession, navigate, route, user]);

  const profileEditAccountId = user?.id;

  useEffect(() => {
    if (route !== '/profile/edit') return;
    const currentUser = userRef.current;
    if (!currentUser) return;
    queueMicrotask(() => {
      setProfileName(currentUser.name);
      setProfileBio(currentUser.bio ?? '');
      setProfileAvatarFile(null);
      setProfileRemoveAvatar(false);
      setProfileEditMessage('');
    });
  }, [route, profileEditAccountId]);

  const openProfileEdit = useCallback(() => {
    navigate('/profile/edit');
  }, [navigate]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileEditMessage('');
    try {
      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('bio', profileBio);
      if (profileRemoveAvatar) formData.append('removeAvatar', 'true');
      if (profileAvatarFile) formData.append('avatar', profileAvatarFile);
      const data = await trackedApiRequest<{ user: AuthUser; message?: string }>(
        '/api/users/me/profile',
        { method: 'PATCH', body: formData },
      );
      setUser(data.user);
      setProfileAvatarFile(null);
      setProfileRemoveAvatar(false);
      setProfileEditMessage(data.message ?? 'Perfil actualizado.');
    } catch (error) {
      setProfileEditMessage(
        error instanceof ApiError ? error.message : 'No se pudo guardar el perfil.',
      );
    } finally {
      setProfileSaving(false);
    }
  }

  function handleProfileEditCancel() {
    if (user) navigate(`/users/${user.id}`);
    else navigate('/');
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterFieldErrors(emptyRegisterFieldErrors());
    setMessage('');
    setAuthLoading(true);
    try {
      const data = await trackedApiRequest<AuthPayload>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setPassword('');
      verificationBootedRef.current = false;
      navigate(data.nextPath ?? '/verify-email');
    } catch (error) {
      if (error instanceof ApiError) {
        setRegisterFieldErrors(parseRegisterFields(error.data));
        setMessage(error.message);
      } else {
        setMessage('Ocurrio un error inesperado.');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyCodeError(false);
    const ok = await runAuthAction(async () => {
      const data = await trackedApiRequest<{ user: AuthUser; message?: string }>(
        '/api/auth/verify-email',
        { method: 'POST', body: JSON.stringify({ code }) },
      );
      setUser(data.user);
      setCode('');
      setMessage(data.message ?? 'Email verificado.');
      navigate('/');
    });
    if (!ok) setVerifyCodeError(true);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginFieldError(false);
    const ok = await runAuthAction(async () => {
      const data = await trackedApiRequest<AuthPayload>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.status === 'verification_required') {
        setPassword('');
        verificationBootedRef.current = false;
        navigate(data.nextPath ?? '/verify-email');
        return;
      }
      if (data.user) {
        setUser(data.user);
        setPassword('');
        navigate('/');
      }
    });
    if (!ok) setLoginFieldError(true);
  }

  async function handleResendCode() {
    setVerifyCodeError(false);
    await runAuthAction(async () => {
      const data = await trackedApiRequest<AuthPayload>('/api/auth/resend-verification', {
        method: 'POST',
      });
      setEmailMasked(data.emailMasked ?? emailMasked);
      setDevCode(data.devCode ?? '');
      setMessage(data.message ?? 'Codigo reenviado.');
    });
  }

  async function handleLogout() {
    await runAuthAction(async () => {
      await trackedApiRequest('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setPosts((current) => current.map((p) => ({ ...p, myReaction: null })));
      navigate('/');
    });
  }

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setMessage('Inicia sesion para publicar.');
      return;
    }
    setPostLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('title', postTitle);
      formData.append('body', postBody);
      if (postImages) {
        Array.from(postImages).forEach((file) => formData.append('images', file));
      }
      const created = await trackedApiRequest<{ message?: string }>('/api/forum/posts', {
        method: 'POST',
        body: formData,
      });
      setPostTitle('');
      setPostBody('');
      setPostImages(null);
      await loadPosts();
      setMessage(created.message ?? 'Publicación creada.');
    } catch (error) {
      if (error instanceof ApiError) {
        const issues = getIssues(error.data);
        setMessage(issues.length ? issues.join(' ') : error.message);
      } else {
        setMessage('Ocurrio un error inesperado.');
      }
    } finally {
      setPostLoading(false);
    }
  }

  async function handleReaction(postId: string, reaction: 'like' | 'dislike') {
    if (!user) {
      setMessage('Inicia sesion para reaccionar.');
      return;
    }
    setMessage('');
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const removing = post.myReaction === reaction;
      setPosts((current) =>
        current.map((p) => (p.id !== postId ? p : applyReactionToggle(p, reaction))),
      );
      if (removing) {
        await trackedApiRequest(`/api/forum/posts/${postId}/reaction`, { method: 'DELETE' }, {
          trackLoading: false,
        });
      } else {
        await trackedApiRequest(
          `/api/forum/posts/${postId}/reaction`,
          { method: 'POST', body: JSON.stringify({ reaction }) },
          { trackLoading: false },
        );
      }
    } catch (error) {
      await loadPosts(true);
      if (error instanceof ApiError) setMessage(error.message);
    }
  }

  async function handleComment(postId: string, body: string) {
    if (!user) {
      setMessage('Inicia sesion para comentar.');
      return false;
    }
    try {
      await trackedApiRequest(`/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      const data = await trackedApiRequest<{ post: ForumPost }>(
        `/api/forum/posts/${postId}`,
        undefined,
        { trackLoading: false },
      );
      setPosts((prev) => mergePostIntoList(prev, data.post));
      return true;
    } catch (error) {
      if (error instanceof ApiError) setMessage(error.message);
      return false;
    }
  }

  const handleDeletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      if (!user) {
        setMessage('Inicia sesion para eliminar publicaciones.');
        return false;
      }
      setMessage('');
      try {
        await trackedApiRequest(`/api/forum/posts/${postId}`, { method: 'DELETE' });
        setPosts((current) => current.filter((p) => p.id !== postId));
        if (route === `/posts/${postId}`) {
          navigate('/');
        }
        setMessage('Publicacion eliminada.');
        return true;
      } catch (error) {
        if (error instanceof ApiError) setMessage(error.message);
        else setMessage('No se pudo eliminar la publicacion.');
        return false;
      }
    },
    [navigate, route, trackedApiRequest, user],
  );

  return {
    route,
    profileUserId,
    publicProfile,
    profileLoading,
    profileError,
    profileEditMessage,
    profileName,
    profileBio,
    profileAvatarFile,
    profileRemoveAvatar,
    profileSaving,
    setProfileName,
    setProfileBio,
    setProfileAvatarFile,
    setProfileRemoveAvatar,
    handleProfileSave,
    handleProfileEditCancel,
    openProfileEdit,
    user,
    name,
    email,
    password,
    code,
    loginFieldError,
    registerFieldErrors,
    verifyCodeError,
    setLoginEmail,
    setLoginPassword,
    setRegisterName,
    setRegisterEmail,
    setRegisterPassword,
    setVerifyCodeField,
    emailMasked,
    message,
    devCode,
    authLoading,
    postLoading,
    checkingSession,
    forumLoading,
    posts,
    postTitle,
    postBody,
    postImages,
    pendingRequests,
    navigate,
    setPostTitle,
    setPostBody,
    setPostImages,
    handleRegister,
    handleVerify,
    handleLogin,
    handleGoogleCredential,
    handleResendCode,
    handleLogout,
    handleCreatePost,
    handleReaction,
    handleComment,
    handleDeletePost,
    isPostDetail,
    detailPostId,
  };
}
