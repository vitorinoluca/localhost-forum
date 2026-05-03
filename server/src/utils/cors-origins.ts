export function normalizeBrowserOrigin(origin: string): string {
  const trimmed = origin.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

export function expandOriginVariants(origin: string): string[] {
  let url: URL;
  try {
    url = new URL(origin.trim());
  } catch {
    return [origin.trim().replace(/\/$/, '')];
  }

  const host = url.hostname;
  const variants = new Set<string>();
  variants.add(url.origin);

  if (host === 'localhost' || host.startsWith('127.')) {
    return [...variants];
  }

  if (host.startsWith('www.')) {
    const apex = new URL(url.href);
    apex.hostname = host.slice(4);
    variants.add(apex.origin);
  } else if (host) {
    const www = new URL(url.href);
    www.hostname = `www.${host}`;
    variants.add(www.origin);
  }

  return [...variants];
}

export function buildAllowedOriginSet(clientOrigin: string, extraOriginsRaw: string | undefined) {
  const set = new Set<string>();
  const add = (o: string) => {
    set.add(normalizeBrowserOrigin(o));
  };
  for (const expanded of expandOriginVariants(clientOrigin)) {
    add(expanded);
  }
  for (const part of (extraOriginsRaw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    for (const expanded of expandOriginVariants(part)) {
      add(expanded);
    }
  }
  return set;
}
