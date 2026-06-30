import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  cacheKey,
  dedupe,
  getMemory,
  readLocalStorage,
  readStoredLanguage,
  setMemory,
  writeLocalStorage,
  writeStoredLanguage,
} from './cache';
import { fetchBundle } from './client';
import { interpolate } from './interpolate';
import { KeyRegistrar } from './registrar';
import type { Bundle, TranslationConfig, TranslationContextValue, TranslationVars } from './types';

export type { TranslationConfig, TranslationContextValue, TranslationVars } from './types';

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

export const TranslationProvider: React.FC<{
  config: TranslationConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const {
    apiUrl,
    apiKey,
    projectName,
    defaultLanguage = 'en',
    fallbackLanguage = 'en',
    cacheToLocalStorage = true,
    requestTimeoutMs = 8000,
    maxRetries = 2,
    registerBatchMs = 400,
    autoRegisterMissingKeys = true,
    onError,
  } = config;

  const fetchConfig = useMemo(
    () => ({ apiUrl, apiKey, projectName, requestTimeoutMs, maxRetries }),
    [apiUrl, apiKey, projectName, requestTimeoutMs, maxRetries],
  );

  // SSR-safe: never read localStorage during render. Start from default, then
  // reconcile the stored language in a post-mount effect to avoid hydration drift.
  const [language, setLanguageState] = useState<string>(defaultLanguage);
  const [activeBundle, setActiveBundle] = useState<Bundle>(() => {
    const key = cacheKey(projectName, defaultLanguage);
    return getMemory(key) ?? {};
  });
  const [fallbackBundle, setFallbackBundle] = useState<Bundle>(() => {
    const key = cacheKey(projectName, fallbackLanguage);
    return getMemory(key) ?? {};
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);

  const registrar = useMemo(
    () => new KeyRegistrar({ apiUrl, apiKey, registerBatchMs, requestTimeoutMs, onError }),
    [apiUrl, apiKey, registerBatchMs, requestTimeoutMs, onError],
  );
  useEffect(() => () => registrar.dispose(), [registrar]);

  // Tracks the latest requested language so a slow in-flight response for a
  // previous language can't overwrite a newer one.
  const requestedLangRef = useRef(language);

  const load = useCallback(
    async (lang: string, isFallback: boolean, signal: AbortSignal) => {
      const key = cacheKey(projectName, lang);
      // Apply to state only if this load is still relevant: not aborted, and for
      // the active language, still the language the user wants. Caching happens
      // regardless so a later switch back is instant.
      const apply = (bundle: Bundle) => {
        if (signal.aborted) return;
        if (isFallback) setFallbackBundle(bundle);
        else if (requestedLangRef.current === lang) setActiveBundle(bundle);
      };

      // 1) Hot memory / localStorage first (stale-while-revalidate).
      const cached = getMemory(key) ?? (cacheToLocalStorage ? readLocalStorage(key) : undefined);
      if (cached) {
        setMemory(key, cached);
        apply(cached);
        setIsReady(true);
      }

      // 2) Revalidate from network (deduped across providers).
      try {
        const fresh = await dedupe(key, () => fetchBundle(fetchConfig, lang, signal));
        setMemory(key, fresh);
        if (cacheToLocalStorage) writeLocalStorage(key, fresh);
        apply(fresh);
        setIsReady(true);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          onError?.(err instanceof Error ? err : new Error(String(err)), `loadBundle:${lang}`);
        }
        // If we had nothing cached, we're still "ready" with defaults so the UI renders.
        if (!cached) setIsReady(true);
      }
    },
    [projectName, cacheToLocalStorage, fetchConfig, onError],
  );

  // Reconcile stored language once on mount (client only).
  useEffect(() => {
    if (!cacheToLocalStorage) return;
    const stored = readStoredLanguage(projectName);
    if (stored && stored !== language) {
      requestedLangRef.current = stored;
      setLanguageState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load active language bundle whenever it changes; abort prior in-flight load.
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    load(language, false, controller.signal).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });
    return () => controller.abort();
  }, [language, load]);

  // Keep the fallback bundle warm when it differs from the active language.
  useEffect(() => {
    if (fallbackLanguage === language) return;
    const controller = new AbortController();
    load(fallbackLanguage, true, controller.signal);
    return () => controller.abort();
  }, [fallbackLanguage, language, load]);

  const changeLanguage = useCallback(
    async (code: string) => {
      if (code === requestedLangRef.current) return;
      requestedLangRef.current = code;
      if (cacheToLocalStorage) writeStoredLanguage(projectName, code);
      setLanguageState(code);
    },
    [projectName, cacheToLocalStorage],
  );

  const t = useCallback(
    (key: string, defaultValue: string, vars?: TranslationVars): string => {
      const value =
        activeBundle[key] ??
        (language !== fallbackLanguage ? fallbackBundle[key] : undefined);

      if (value !== undefined) return interpolate(value, vars);

      // Missing — queue for batched registration (client only) and render the default.
      if (typeof window !== 'undefined' && autoRegisterMissingKeys) {
        registrar.enqueue(key, defaultValue);
      }
      return interpolate(defaultValue, vars);
    },
    [activeBundle, fallbackBundle, language, fallbackLanguage, autoRegisterMissingKeys, registrar],
  );

  const value = useMemo<TranslationContextValue>(
    () => ({ t, language, changeLanguage, isLoading, isReady }),
    [t, language, changeLanguage, isLoading, isReady],
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
