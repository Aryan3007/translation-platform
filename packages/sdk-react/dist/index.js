"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationProvider = void 0;
exports.useTranslation = useTranslation;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const cache_1 = require("./cache");
const client_1 = require("./client");
const interpolate_1 = require("./interpolate");
const registrar_1 = require("./registrar");
const TranslationContext = (0, react_1.createContext)(undefined);
const TranslationProvider = ({ config, children }) => {
    const { apiUrl, apiKey, projectName, defaultLanguage = 'en', fallbackLanguage = 'en', cacheToLocalStorage = true, requestTimeoutMs = 8000, maxRetries = 2, registerBatchMs = 400, autoRegisterMissingKeys = true, onError, } = config;
    const fetchConfig = (0, react_1.useMemo)(() => ({ apiUrl, apiKey, projectName, requestTimeoutMs, maxRetries }), [apiUrl, apiKey, projectName, requestTimeoutMs, maxRetries]);
    // SSR-safe: never read localStorage during render. Start from default, then
    // reconcile the stored language in a post-mount effect to avoid hydration drift.
    const [language, setLanguageState] = (0, react_1.useState)(defaultLanguage);
    const [activeBundle, setActiveBundle] = (0, react_1.useState)(() => {
        const key = (0, cache_1.cacheKey)(projectName, defaultLanguage);
        return (0, cache_1.getMemory)(key) ?? {};
    });
    const [fallbackBundle, setFallbackBundle] = (0, react_1.useState)(() => {
        const key = (0, cache_1.cacheKey)(projectName, fallbackLanguage);
        return (0, cache_1.getMemory)(key) ?? {};
    });
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isReady, setIsReady] = (0, react_1.useState)(false);
    const registrar = (0, react_1.useMemo)(() => new registrar_1.KeyRegistrar({ apiUrl, apiKey, registerBatchMs, requestTimeoutMs, onError }), [apiUrl, apiKey, registerBatchMs, requestTimeoutMs, onError]);
    (0, react_1.useEffect)(() => () => registrar.dispose(), [registrar]);
    // Tracks the latest requested language so a slow in-flight response for a
    // previous language can't overwrite a newer one.
    const requestedLangRef = (0, react_1.useRef)(language);
    const load = (0, react_1.useCallback)(async (lang, isFallback, signal) => {
        const key = (0, cache_1.cacheKey)(projectName, lang);
        // Apply to state only if this load is still relevant: not aborted, and for
        // the active language, still the language the user wants. Caching happens
        // regardless so a later switch back is instant.
        const apply = (bundle) => {
            if (signal.aborted)
                return;
            if (isFallback)
                setFallbackBundle(bundle);
            else if (requestedLangRef.current === lang)
                setActiveBundle(bundle);
        };
        // 1) Hot memory / localStorage first (stale-while-revalidate).
        const cached = (0, cache_1.getMemory)(key) ?? (cacheToLocalStorage ? (0, cache_1.readLocalStorage)(key) : undefined);
        if (cached) {
            (0, cache_1.setMemory)(key, cached);
            apply(cached);
            setIsReady(true);
        }
        // 2) Revalidate from network (deduped across providers).
        try {
            const fresh = await (0, cache_1.dedupe)(key, () => (0, client_1.fetchBundle)(fetchConfig, lang, signal));
            (0, cache_1.setMemory)(key, fresh);
            if (cacheToLocalStorage)
                (0, cache_1.writeLocalStorage)(key, fresh);
            apply(fresh);
            setIsReady(true);
        }
        catch (err) {
            if (!(err instanceof Error && err.name === 'AbortError')) {
                onError?.(err instanceof Error ? err : new Error(String(err)), `loadBundle:${lang}`);
            }
            // If we had nothing cached, we're still "ready" with defaults so the UI renders.
            if (!cached)
                setIsReady(true);
        }
    }, [projectName, cacheToLocalStorage, fetchConfig, onError]);
    // Reconcile stored language once on mount (client only).
    (0, react_1.useEffect)(() => {
        if (!cacheToLocalStorage)
            return;
        const stored = (0, cache_1.readStoredLanguage)(projectName);
        if (stored && stored !== language) {
            requestedLangRef.current = stored;
            setLanguageState(stored);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Load active language bundle whenever it changes; abort prior in-flight load.
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        setIsLoading(true);
        load(language, false, controller.signal).finally(() => {
            if (!controller.signal.aborted)
                setIsLoading(false);
        });
        return () => controller.abort();
    }, [language, load]);
    // Keep the fallback bundle warm when it differs from the active language.
    (0, react_1.useEffect)(() => {
        if (fallbackLanguage === language)
            return;
        const controller = new AbortController();
        load(fallbackLanguage, true, controller.signal);
        return () => controller.abort();
    }, [fallbackLanguage, language, load]);
    const changeLanguage = (0, react_1.useCallback)(async (code) => {
        if (code === requestedLangRef.current)
            return;
        requestedLangRef.current = code;
        if (cacheToLocalStorage)
            (0, cache_1.writeStoredLanguage)(projectName, code);
        setLanguageState(code);
    }, [projectName, cacheToLocalStorage]);
    const t = (0, react_1.useCallback)((key, defaultValue, vars) => {
        const value = activeBundle[key] ??
            (language !== fallbackLanguage ? fallbackBundle[key] : undefined);
        if (value !== undefined)
            return (0, interpolate_1.interpolate)(value, vars);
        // Missing — queue for batched registration (client only) and render the default.
        if (typeof window !== 'undefined' && autoRegisterMissingKeys) {
            registrar.enqueue(key, defaultValue);
        }
        return (0, interpolate_1.interpolate)(defaultValue, vars);
    }, [activeBundle, fallbackBundle, language, fallbackLanguage, autoRegisterMissingKeys, registrar]);
    const value = (0, react_1.useMemo)(() => ({ t, language, changeLanguage, isLoading, isReady }), [t, language, changeLanguage, isLoading, isReady]);
    return (0, jsx_runtime_1.jsx)(TranslationContext.Provider, { value: value, children: children });
};
exports.TranslationProvider = TranslationProvider;
function useTranslation() {
    const context = (0, react_1.useContext)(TranslationContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
}
