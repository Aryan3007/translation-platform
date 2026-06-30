import type { Bundle } from './types';
export declare const cacheKey: (project: string, language: string) => string;
export declare function getMemory(key: string): Bundle | undefined;
export declare function setMemory(key: string, bundle: Bundle): void;
/** Deduplicates concurrent loads: callers for the same key await one shared promise. */
export declare function dedupe(key: string, loader: () => Promise<Bundle>): Promise<Bundle>;
export declare function readLocalStorage(key: string): Bundle | undefined;
export declare function writeLocalStorage(key: string, bundle: Bundle): void;
export declare function readStoredLanguage(project: string): string | undefined;
export declare function writeStoredLanguage(project: string, language: string): void;
