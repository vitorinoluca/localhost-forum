import type { Route } from '../types';

const roots = new Set<string>([
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/app',
  '/profile/edit',
  '/admin',
  '/notifications',
  '/terms',
  '/privacy',
  '/contact',
]);

const uuidSegment = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePostDetailUuid(route: Route): string | null {
  if (!route.startsWith('/posts/')) return null;
  const id = route.slice('/posts/'.length);
  return uuidSegment.test(id) ? id : null;
}

export function getRoute(): Route {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path.startsWith('/posts/') && path.length > '/posts/'.length) {
    return path as Route;
  }
  if (path.startsWith('/users/')) {
    const id = path.slice('/users/'.length);
    if (uuidSegment.test(id)) {
      return `/users/${id}` as Route;
    }
  }
  return (roots.has(path) ? path : '/') as Route;
}
