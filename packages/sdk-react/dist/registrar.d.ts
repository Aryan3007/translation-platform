import type { TranslationConfig } from './types';
export declare class KeyRegistrar {
    private readonly config;
    private queue;
    private timer;
    private readonly reported;
    constructor(config: Pick<TranslationConfig, 'apiUrl' | 'apiKey' | 'registerBatchMs' | 'requestTimeoutMs' | 'onError'>);
    /** Enqueue a missing key. No-op if already reported or already queued. */
    enqueue(key: string, defaultValue: string, namespace?: string): void;
    private schedule;
    flush(): Promise<void>;
    dispose(): void;
}
