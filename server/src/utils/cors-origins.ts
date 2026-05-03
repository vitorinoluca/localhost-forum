export function normalizeBrowserOrigin(origin: string): string {
  const trimmed = origin.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
}

/** Origen principal + lista opcional separada por comas (sin variantes www automáticas). */
export function buildAllowedOriginSet(primary: string, extrasRaw: string | undefined): Set<string> {
  const set = new Set<string>();
  const add = (o: string) => {
    const t = o.trim();
    if (!t) return;
    set.add(normalizeBrowserOrigin(t));
  };
  add(primary);
  for (const part of (extrasRaw ?? '').split(',')) {
    add(part);
  }
  return set;
}
