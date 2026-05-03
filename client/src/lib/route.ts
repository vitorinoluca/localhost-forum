import type { Route } from '../types';

const roots = new Set<string>([
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/profile/edit',
  '/admin',
  '/notifications',
  '/terms',
  '/privacy',
  '/contact',
  '/404',
]);

const uuidSegment =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePostDetailUuid(route: Route): string | null {
  if (!route.startsWith('/posts/')) return null;
  const id = route.slice('/posts/'.length);
  return uuidSegment.test(id) ? id : null;
}

export function getRoute(): Route {
  let path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/app') path = '/';

  if (path.startsWith('/posts/')) {
    const id = path.slice('/posts/'.length);
    if (id && uuidSegment.test(id)) {
      return path as Route;
    }
    return '/404';
  }

  if (path.startsWith('/users/')) {
    const id = path.slice('/users/'.length);
    if (id && uuidSegment.test(id)) {
      return `/users/${id}` as Route;
    }
    return '/404';
  }

  if (roots.has(path)) {
    return path as Route;
  }

  return '/404';
}
