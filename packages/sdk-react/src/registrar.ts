import { registerKeys } from './client';
import type { TranslationConfig } from './types';

type PendingKey = { key: string; defaultValue: string; namespace: string };

/**
 * Debounced, deduplicated registrar for missing keys.
 *
 * A page that renders 50 fresh keys on mount used to fire 50 POSTs; this
 * collects them and flushes one batch after `batchMs` of quiet. Keys already
 * reported (this session) are never sent again, even across remounts, because
 * the `reported` set lives at module scope keyed by project+apiUrl.
 */
const reportedByEndpoint = new Map<string, Set<string>>();

export class KeyRegistrar {
  private queue = new Map<string, PendingKey>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly reported: Set<string>;

  constructor(
    private readonly config: Pick<
      TranslationConfig,
      'apiUrl' | 'apiKey' | 'registerBatchMs' | 'requestTimeoutMs' | 'onError'
    >,
  ) {
    const endpoint = `${config.apiUrl}|${config.apiKey}`;
    let set = reportedByEndpoint.get(endpoint);
    if (!set) {
      set = new Set<string>();
      reportedByEndpoint.set(endpoint, set);
    }
    this.reported = set;
  }

  /** Enqueue a missing key. No-op if already reported or already queued. */
  enqueue(key: string, defaultValue: string, namespace = 'common'): void {
    const id = `${namespace}:${key}`;
    if (this.reported.has(id) || this.queue.has(id)) return;
    this.queue.set(id, { key, defaultValue, namespace });
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) return;
    const delay = this.config.registerBatchMs ?? 400;
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.size === 0) return;

    const batch = Array.from(this.queue.values());
    // Mark reported up-front so concurrent renders don't re-enqueue while in flight.
    for (const [id] of this.queue) this.reported.add(id);
    this.queue.clear();

    try {
      await registerKeys(this.config, batch, this.config.requestTimeoutMs ?? 8000);
    } catch (err) {
      // Roll back so a transient failure can be retried on the next discovery.
      for (const k of batch) this.reported.delete(`${k.namespace}:${k.key}`);
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)), 'registerKeys');
    }
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Flush whatever is pending so keys discovered just before unmount still land.
    void this.flush();
  }
}
