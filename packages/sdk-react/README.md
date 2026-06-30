# @translation-platform/sdk-react

React/Next.js client for the centralized Translation Platform.

- **Stale-while-revalidate** — renders cached bundles instantly (memory → localStorage), revalidates in the background.
- **Shared module cache** — multiple `TranslationProvider`s in one app dedupe fetches and share bundles.
- **Resilient network** — per-request timeout, bounded retries with backoff, and abort-on-language-switch (no stale overwrites).
- **Batched key auto-registration** — missing keys are queued and flushed in one debounced batch instead of one request each.
- **Interpolation + plurals** — `t("cart.count", "{n} items", { n })` and ICU-style plural blocks.
- **SSR-safe** — no `localStorage` reads during render; stored language reconciled post-mount.

## Install

```bash
pnpm add github:Aryan3007/translation-platform#path:packages/sdk-react
```

The package ships a built `dist/` and also rebuilds via its `prepare` script on install, so no consumer-side build step is needed.

## Usage

```tsx
import { TranslationProvider, useTranslation } from '@translation-platform/sdk-react';

<TranslationProvider
  config={{
    apiUrl: process.env.NEXT_PUBLIC_TRANSLATION_API_URL!,
    apiKey: process.env.NEXT_PUBLIC_TRANSLATION_API_KEY!,
    projectName: 'YourProject',
    defaultLanguage: 'en',
    fallbackLanguage: 'en',
    cacheToLocalStorage: true,
    // prod tuning (all optional):
    requestTimeoutMs: 8000,
    maxRetries: 2,
    registerBatchMs: 400,
    autoRegisterMissingKeys: process.env.NODE_ENV !== 'production',
    onError: (err, ctx) => console.warn('[i18n]', ctx, err),
  }}
>
  {children}
</TranslationProvider>
```

```tsx
const { t, language, changeLanguage, isLoading, isReady } = useTranslation();

t('home.title', 'Just say what you want.');
t('cart.count', '{n} {n, plural, one {item} other {items}}', { n: count });
```

## Config

| Option | Default | Notes |
|---|---|---|
| `apiUrl`, `apiKey`, `projectName` | — | Required. |
| `defaultLanguage` / `fallbackLanguage` | `"en"` | Active language seed / per-key fallback. |
| `cacheToLocalStorage` | `true` | Stale-while-revalidate persistence. |
| `requestTimeoutMs` | `8000` | Per-request abort timeout. |
| `maxRetries` | `2` | Retries on network/5xx/429 (4xx not retried). |
| `registerBatchMs` | `400` | Debounce window for batched key registration. |
| `autoRegisterMissingKeys` | `true` | Disable in prod to freeze the key set. |
| `onError` | — | Non-fatal diagnostics callback. |

`isReady` is `true` once any bundle (cache or network) has been applied — use it to gate first paint if you want to avoid showing raw defaults. `isLoading` reflects background revalidation.
