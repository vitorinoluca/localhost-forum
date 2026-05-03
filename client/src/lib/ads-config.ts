import type { Route } from '../types';

export function isAdLayoutPreview(): boolean {
  return import.meta.env.VITE_AD_LAYOUT_PREVIEW === 'true';
}

export function getAdSenseClient(): string | undefined {
  const v = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT?.trim();
  return v || undefined;
}

export type AdSlotKey = 'top' | 'feed' | 'article' | 'profile';

export function getAdSlot(key: AdSlotKey): string | undefined {
  const map = {
    top: import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_TOP,
    feed: import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_FEED,
    article: import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_ARTICLE,
    profile: import.meta.env.VITE_GOOGLE_ADSENSE_SLOT_PROFILE,
  } as const;
  const raw = map[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

export function shouldShowAdsOnRoute(route: Route): boolean {
  if (
    route === '/login' ||
    route === '/register' ||
    route === '/verify-email' ||
    route === '/profile/edit' ||
    route === '/notifications' ||
    route === '/terms' ||
    route === '/privacy' ||
    route === '/contact' ||
    route === '/404'
  ) {
    return false;
  }
  if (isAdLayoutPreview()) return true;
  if (!getAdSenseClient()) return false;
  return true;
}

export function shouldShowAdPlacement(showAds: boolean, slot: string | undefined): boolean {
  return showAds && (isAdLayoutPreview() || !!slot);
}
