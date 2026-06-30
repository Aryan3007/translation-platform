import type { Bundle } from './types';

/**
 * Module-level cache shared across every TranslationProvider in the app.
 * Two roles:
 *  - dedupe concurrent fetches for the same (project, language) into one promise
 *  - serve a hot in-memory bundle so a second provider doesn't refetch
 */
const memory = new Map<string, Bundle>();
const inflight = new Map<string, Promise<Bundle>>();

export const cacheKey = (project: string, language: string): string =>
  `translations:${project.toLowerCase()}:${language.toLowerCase()}`;

export function getMemory(key: string): Bundle | undefined {
  return memory.get(key);
}

export function setMemory(key: string, bundle: Bundle): void {
  memory.set(key, bundle);
}

/** Deduplicates concurrent loads: callers for the same key await one shared promise. */
export function dedupe(key: string, loader: () => Promise<Bundle>): Promise<Bundle> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = loader().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

const lsKey = (key: string) => `tp:${key}`;

export function readLocalStorage(key: string): Bundle | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(lsKey(key));
    return raw ? (JSON.parse(raw) as Bundle) : undefined;
  } catch {
    return undefined;
  }
}

export function writeLocalStorage(key: string, bundle: Bundle): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(lsKey(key), JSON.stringify(bundle));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

const LANG_KEY = (project: string) => `tp:lang:${project.toLowerCase()}`;

export function readStoredLanguage(project: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem(LANG_KEY(project)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredLanguage(project: string, language: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_KEY(project), language);
  } catch {
    /* non-fatal */
  }
}
