export interface TranslationConfig {
    /** Base URL of the Translation Platform API, e.g. https://api.translations.example.com */
    apiUrl: string;
    /** Project API key (x-api-key). Used for both fetching bundles and registering keys. */
    apiKey: string;
    /** Project name as registered on the platform. */
    projectName: string;
    /** Initial language when nothing is cached. Default "en". */
    defaultLanguage?: string;
    /** Language used when a key has no value in the active language. Default "en". */
    fallbackLanguage?: string;
    /** Persist bundles + active language to localStorage (stale-while-revalidate). Default true. */
    cacheToLocalStorage?: boolean;
    /** Per-request timeout in ms. Default 8000. */
    requestTimeoutMs?: number;
    /** Max retry attempts for a failed bundle fetch (network/5xx). Default 2. */
    maxRetries?: number;
    /** Debounce window (ms) for batching missing-key registration. Default 400. */
    registerBatchMs?: number;
    /** Auto-register missing keys discovered at runtime. Default true. Set false in prod if keys are managed manually. */
    autoRegisterMissingKeys?: boolean;
    /** Hook for diagnostics; receives non-fatal SDK errors. */
    onError?: (error: Error, context: string) => void;
}
export type TranslationVars = Record<string, string | number>;
export interface TranslationContextValue {
    /**
     * Translate a key.
     * @param key dot-notated key, e.g. "auth.login.title"
     * @param defaultValue English fallback; also registered to the platform when missing.
     * @param vars optional interpolation values for {placeholder} and {count, plural, ...} tokens.
     */
    t: (key: string, defaultValue: string, vars?: TranslationVars) => string;
    /** Active language code. */
    language: string;
    /** Switch language; resolves once the new bundle has settled (cache or network). */
    changeLanguage: (code: string) => Promise<void>;
    /** True while a fresh bundle is being fetched in the background. */
    isLoading: boolean;
    /** True once at least one bundle (cache or network) has been applied. */
    isReady: boolean;
}
export type Bundle = Record<string, string>;
