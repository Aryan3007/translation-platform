"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBundle = fetchBundle;
exports.registerKeys = registerKeys;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Fetch with an enforced timeout, composing an external abort signal with the timeout. */
async function fetchWithTimeout(url, init, timeoutMs, externalSignal) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted)
            controller.abort();
        else
            externalSignal.addEventListener('abort', onAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener('abort', onAbort);
    }
}
const isAbort = (err) => err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
/**
 * Fetches a translation bundle with bounded retries and exponential backoff.
 * Aborts (language switch / unmount) reject immediately without retrying.
 */
async function fetchBundle(config, language, signal) {
    const url = `${config.apiUrl.replace(/\/$/, '')}/v1/translations/${encodeURIComponent(config.projectName)}/${encodeURIComponent(language)}`;
    let lastError;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            const res = await fetchWithTimeout(url, { headers: { 'x-api-key': config.apiKey } }, config.requestTimeoutMs, signal);
            if (res.ok) {
                return (await res.json());
            }
            // 4xx (except 429) are not retryable — the request is wrong, not flaky.
            if (res.status < 500 && res.status !== 429) {
                throw new Error(`Translation fetch failed: ${res.status} ${res.statusText}`);
            }
            lastError = new Error(`Translation fetch failed: ${res.status} ${res.statusText}`);
        }
        catch (err) {
            if (isAbort(err))
                throw err;
            lastError = err instanceof Error ? err : new Error(String(err));
        }
        if (attempt < config.maxRetries) {
            await sleep(Math.min(1000 * 2 ** attempt, 4000));
        }
    }
    throw lastError ?? new Error('Translation fetch failed');
}
/** POSTs a batch of newly-discovered keys for registration. Best-effort. */
async function registerKeys(config, keys, timeoutMs) {
    if (keys.length === 0)
        return;
    const base = config.apiUrl.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json', 'x-api-key': config.apiKey };
    // Prefer a single batch endpoint; fall back to per-key POSTs if the API
    // doesn't expose /v1/keys/batch (older platform versions).
    const batchRes = await fetchWithTimeout(`${base}/v1/keys/batch`, { method: 'POST', headers, body: JSON.stringify({ keys }) }, timeoutMs).catch(() => null);
    if (batchRes && batchRes.ok)
        return;
    if (batchRes && batchRes.status !== 404) {
        throw new Error(`Batch key registration failed: ${batchRes.status}`);
    }
    // Fallback: register individually (still concurrent, but bounded by the batch size).
    await Promise.allSettled(keys.map((k) => fetchWithTimeout(`${base}/v1/keys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: k.key, defaultValue: k.defaultValue, namespace: k.namespace ?? 'common' }),
    }, timeoutMs)));
}
