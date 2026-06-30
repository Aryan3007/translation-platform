# Translation Platform Rules & Integration Guide

All translations in this project are managed via our centralized **Translation Platform**. Do NOT create, modify, or maintain local translation JSON files (e.g., `en.json`, `de.json`, `fr.json`).

---

## 1. Setup & Installation

### Install the SDK
Install the React SDK directly from the Translation Platform repository:
```bash
pnpm add github:Aryan3007/translation-platform#path:packages/sdk-react
```

### Environment Variables
Add the following variables to your `.env.local` (and ensure they are configured in your hosting provider):
```env
NEXT_PUBLIC_TRANSLATION_API_URL="https://api.translations.yourdomain.com" # Or http://localhost:3001 for local dev
NEXT_PUBLIC_TRANSLATION_API_KEY="your-project-api-key-here"
```

---

## 2. Wrapping the Application (Next.js App Router)

Wrap the application at the root layout (`src/app/layout.tsx`).

```tsx
import { TranslationProvider } from '@translation-platform/sdk-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TranslationProvider
          config={{
            apiUrl: process.env.NEXT_PUBLIC_TRANSLATION_API_URL!,
            apiKey: process.env.NEXT_PUBLIC_TRANSLATION_API_KEY!,
            projectName: "Klarwein", // Replace with your project name
            defaultLanguage: "en",
            fallbackLanguage: "en",
            cacheToLocalStorage: true, // Prevents loading flashes (Stale-While-Revalidate)
          }}
        >
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
```

---

## 3. Usage Rules (For Developers & AI)

> [!IMPORTANT]
> **Rule 1**: Never create local JSON translation files.
> **Rule 2**: Use the `useTranslation` hook for all UI text.
> **Rule 3**: Always provide a default English value as the second argument. This ensures the UI never breaks, and registers the key automatically in the Translation Platform database in the background if it doesn't exist.

### Standard Usage
Use the `useTranslation` hook to translate text. The hook returns:
* `t(key, defaultValue)`: Translate function.
* `language`: The current active language code (e.g. `en`, `de`).
* `changeLanguage(code)`: Function to switch languages.
* `isLoading`: Boolean indicating if a fresh translation bundle is fetching in the background.

```tsx
import { useTranslation } from '@translation-platform/sdk-react';

export default function HeroSection() {
  const { t, language, changeLanguage } = useTranslation();

  return (
    <div className="p-8">
      {/* 1. Simple Translation with Fallback (auto-registers and auto-translates) */}
      <h1>{t("hero.title", "Welcome to Klarwein")}</h1>
      <p>{t("hero.subtitle", "Build amazing software fast.")}</p>

      {/* 2. Changing Languages */}
      <div className="mt-4 flex gap-2">
        <button onClick={() => changeLanguage("en")} disabled={language === "en"}>
          English
        </button>
        <button onClick={() => changeLanguage("de")} disabled={language === "de"}>
          Deutsch
        </button>
      </div>
    </div>
  );
}
```

### Key Naming Conventions
Always use descriptive, dot-notated keys grouped by section/component:
* `common.buttons.save` -> "Save"
* `auth.login.title` -> "Sign In to Your Account"
* `dashboard.sidebar.settings` -> "Settings"

---

## 4. How the AI Translation Flow Works

```
[Developer writes t("auth.btn", "Sign In")]
                    │
                    ▼
          [SDK registers key]
                    │
                    ▼
     [AI translates in background]
 (via Gemini 1.5 Flash or GPT-4o Mini)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  [German: "Anmelden"]     [French: "Se connecter"]
   (Status: AI_TRANSLATED)  (Status: AI_TRANSLATED)
        │
        ▼
[Instantly delivered to Client App]
```

1. **Auto-Discovery & AI Translation**: When you write `t("auth.btn", "Sign In")` in the code, the SDK registers it with the platform. If AI translation is enabled for the project, the backend immediately calls an LLM (Gemini or OpenAI) in the background to translate `"Sign In"` into German, French, etc.
2. **Instant Delivery**: The AI-generated translations are immediately saved with the status `AI_TRANSLATED` and are served to the client application. The user will see the translated German text instantly on their next page load without any manual intervention.
3. **Verification**: 
   * Open the **Translation Dashboard**.
   * Filter by **"AI Generated"** to see unverified translations.
   * Review the translation, then click the **Verify** (checkmark) button to promote the status to `TRANSLATED` (indicating it has been manually reviewed and approved).
   * You can also edit the AI translation inline if it needs refinement.
