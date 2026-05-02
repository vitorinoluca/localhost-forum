const siteName = import.meta.env.VITE_SITE_NAME?.trim() || 'localhost:forum';
const defaultDescription =
  import.meta.env.VITE_SITE_DESCRIPTION?.trim() ||
  'Foro de participación: publicaciones, comentarios, reacciones y perfiles de usuario.';

const baseUrl = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const ogImage = (import.meta.env.VITE_OG_IMAGE_URL || '').trim();
const ogImageAltDefault =
  import.meta.env.VITE_OG_IMAGE_ALT?.trim() || `${siteName} · vista previa`;
const ogLocale = import.meta.env.VITE_OG_LOCALE?.trim() || 'es_ES';
const themeColor = import.meta.env.VITE_THEME_COLOR?.trim() || '#0a0a0a';
const twitterSite = (import.meta.env.VITE_TWITTER_SITE || '').trim().replace(/^@/, '');
const twitterCreator = (import.meta.env.VITE_TWITTER_CREATOR || '').trim().replace(/^@/, '');
const siteAuthor = (import.meta.env.VITE_SITE_AUTHOR || '').trim();

export {
  siteName,
  defaultDescription,
  baseUrl,
  ogImage,
  ogLocale,
  themeColor,
  twitterSite,
  twitterCreator,
};

export function normalizeDescription(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function upsertMetaName(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertMetaProperty(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertMetaHttpEquiv(httpEquiv: string, content: string) {
  let el = document.head.querySelector(`meta[http-equiv="${httpEquiv}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('http-equiv', httpEquiv);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertHreflangDefault(href: string) {
  let el = document.getElementById('link-hreflang-x-default') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.id = 'link-hreflang-x-default';
    el.rel = 'alternate';
    el.setAttribute('hreflang', 'x-default');
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export type DocumentSeoInput = {
  title: string;
  description: string;
  path: string;
  robots: 'index,follow' | 'noindex,nofollow';
  ogType?: 'website' | 'article';
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  ogImageUrl?: string;
  ogImageAlt?: string;
};

export function applyDocumentSeo(input: DocumentSeoInput) {
  document.title = input.title;

  const desc = normalizeDescription(input.description);
  upsertMetaName('description', desc);
  upsertMetaName('robots', input.robots);

  if (input.robots === 'index,follow') {
    upsertMetaName(
      'googlebot',
      'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    );
  } else {
    upsertMetaName('googlebot', 'noindex, nofollow');
  }

  if (siteAuthor) {
    upsertMetaName('author', siteAuthor);
  }

  upsertMetaHttpEquiv('content-language', ogLocale.split('_')[0] ?? 'es');
  upsertMetaName('referrer', 'strict-origin-when-cross-origin');
  upsertMetaName('theme-color', themeColor);
  upsertMetaName('color-scheme', 'dark');
  upsertMetaName('format-detection', 'telephone=no');

  const ogTitle = input.title;
  const ogType = input.ogType ?? 'website';
  const imageUrl = (input.ogImageUrl ?? ogImage).trim();
  const imageAlt = (input.ogImageAlt ?? ogImageAltDefault).trim();

  upsertMetaProperty('og:type', ogType);
  upsertMetaProperty('og:title', ogTitle);
  upsertMetaProperty('og:description', desc);
  upsertMetaProperty('og:site_name', siteName);
  upsertMetaProperty('og:locale', ogLocale);

  upsertMetaName('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
  upsertMetaName('twitter:title', ogTitle);
  upsertMetaName('twitter:description', desc);

  if (twitterSite) {
    upsertMetaName('twitter:site', `@${twitterSite}`);
  }
  if (twitterCreator) {
    upsertMetaName('twitter:creator', `@${twitterCreator}`);
  }

  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const canonicalPath = input.path.startsWith('/') ? input.path : `/${input.path}`;
  const url = origin ? `${origin}${canonicalPath === '//' ? '/' : canonicalPath}` : '';

  if (url) {
    upsertMetaProperty('og:url', url);
    upsertCanonical(url);

    if (baseUrl) {
      upsertHreflangDefault(url);
    }
  }

  if (imageUrl) {
    upsertMetaProperty('og:image', imageUrl);
    upsertMetaProperty('og:image:alt', imageAlt);
    if (imageUrl.startsWith('https://')) {
      upsertMetaProperty('og:image:secure_url', imageUrl);
    }
    upsertMetaName('twitter:image', imageUrl);
    upsertMetaName('twitter:image:alt', imageAlt);
  }

  if (ogType === 'article') {
    if (input.articlePublishedTime) {
      upsertMetaProperty('article:published_time', input.articlePublishedTime);
    }
    if (input.articleModifiedTime) {
      upsertMetaProperty('article:modified_time', input.articleModifiedTime);
    }
  }
}

const JSON_LD_ID = 'jsonld-dynamic';

export function applyJsonLd(data: Record<string, unknown> | Record<string, unknown>[] | null) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    const script = document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'jsonld');
    document.head.appendChild(script);
    el = script;
  }
  const payload = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : { '@context': 'https://schema.org', ...data };
  el.textContent = JSON.stringify(payload);
}

export function buildWebSiteJsonLd(): Record<string, unknown> | null {
  if (!baseUrl) return null;
  return {
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    description: defaultDescription,
    inLanguage: ogLocale.replace('_', '-'),
  };
}

export function buildArticleJsonLd(input: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  imageUrls?: string[];
}): Record<string, unknown> {
  const publisher = {
    '@type': 'Organization',
    name: siteName,
    ...(baseUrl ? { url: baseUrl } : {}),
  };

  return {
    '@type': 'Article',
    headline: input.title,
    description: normalizeDescription(input.description, 300),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      '@type': 'Person',
      name: input.authorName,
    },
    publisher,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
    ...(input.imageUrls?.length ? { image: input.imageUrls } : {}),
  };
}

export function buildPersonProfileJsonLd(input: {
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
}): Record<string, unknown> {
  const person: Record<string, unknown> = {
    '@type': 'Person',
    name: input.name,
    description: normalizeDescription(input.description, 300),
    url: input.url,
  };
  if (input.imageUrl) {
    person.image = input.imageUrl;
  }

  return {
    '@type': 'ProfilePage',
    mainEntity: person,
    url: input.url,
  };
}
