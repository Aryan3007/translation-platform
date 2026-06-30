import type { Bundle, TranslationConfig } from './types';
/**
 * Fetches a translation bundle with bounded retries and exponential backoff.
 * Aborts (language switch / unmount) reject immediately without retrying.
 */
export declare function fetchBundle(config: Required<Pick<TranslationConfig, 'apiUrl' | 'apiKey' | 'projectName' | 'requestTimeoutMs' | 'maxRetries'>>, language: string, signal?: AbortSignal): Promise<Bundle>;
/** POSTs a batch of newly-discovered keys for registration. Best-effort. */
export declare function registerKeys(config: Pick<TranslationConfig, 'apiUrl' | 'apiKey'>, keys: Array<{
    key: string;
    defaultValue: string;
    namespace?: string;
}>, timeoutMs: number): Promise<void>;
