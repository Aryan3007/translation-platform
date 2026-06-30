"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheKey = void 0;
exports.getMemory = getMemory;
exports.setMemory = setMemory;
exports.dedupe = dedupe;
exports.readLocalStorage = readLocalStorage;
exports.writeLocalStorage = writeLocalStorage;
exports.readStoredLanguage = readStoredLanguage;
exports.writeStoredLanguage = writeStoredLanguage;
/**
 * Module-level cache shared across every TranslationProvider in the app.
 * Two roles:
 *  - dedupe concurrent fetches for the same (project, language) into one promise
 *  - serve a hot in-memory bundle so a second provider doesn't refetch
 */
const memory = new Map();
const inflight = new Map();
const cacheKey = (project, language) => `translations:${project.toLowerCase()}:${language.toLowerCase()}`;
exports.cacheKey = cacheKey;
function getMemory(key) {
    return memory.get(key);
}
function setMemory(key, bundle) {
    memory.set(key, bundle);
}
/** Deduplicates concurrent loads: callers for the same key await one shared promise. */
function dedupe(key, loader) {
    const existing = inflight.get(key);
    if (existing)
        return existing;
    const p = loader().finally(() => {
        inflight.delete(key);
    });
    inflight.set(key, p);
    return p;
}
const lsKey = (key) => `tp:${key}`;
function readLocalStorage(key) {
    if (typeof window === 'undefined')
        return undefined;
    try {
        const raw = window.localStorage.getItem(lsKey(key));
        return raw ? JSON.parse(raw) : undefined;
    }
    catch {
        return undefined;
    }
}
function writeLocalStorage(key, bundle) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(lsKey(key), JSON.stringify(bundle));
    }
    catch {
        /* quota / private mode — non-fatal */
    }
}
const LANG_KEY = (project) => `tp:lang:${project.toLowerCase()}`;
function readStoredLanguage(project) {
    if (typeof window === 'undefined')
        return undefined;
    try {
        return window.localStorage.getItem(LANG_KEY(project)) ?? undefined;
    }
    catch {
        return undefined;
    }
}
function writeStoredLanguage(project, language) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(LANG_KEY(project), language);
    }
    catch {
        /* non-fatal */
    }
}
