import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface TranslationConfig {
  apiUrl: string;
  apiKey: string;
  projectName: string;
  defaultLanguage?: string;
  fallbackLanguage?: string;
  cacheToLocalStorage?: boolean;
}

interface TranslationContextType {
  t: (key: string, defaultValue: string) => string;
  language: string;
  changeLanguage: (code: string) => Promise<void>;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{
  config: TranslationConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const {
    apiUrl,
    apiKey,
    projectName,
    defaultLanguage = 'en',
    fallbackLanguage = 'en',
    cacheToLocalStorage = true,
  } = config;

  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined' && cacheToLocalStorage) {
      return localStorage.getItem(`translation_lang:${projectName}`) || defaultLanguage;
    }
    return defaultLanguage;
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep track of keys reported in the current session to avoid duplicate API calls
  const reportedKeysRef = useRef<Set<string>>(new Set());

  // Cache key helper
  const getCacheKey = useCallback((lang: string) => `translations:${projectName.toLowerCase()}:${lang.toLowerCase()}`, [projectName]);

  // Load translations
  const loadTranslations = useCallback(async (lang: string) => {
    setIsLoading(true);
    const cacheKey = getCacheKey(lang);

    // 1. Try local storage first (Stale-While-Revalidate)
    if (typeof window !== 'undefined' && cacheToLocalStorage) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setTranslations(JSON.parse(cached));
          setIsLoading(false); // Render cached version immediately
        } catch (e) {
          console.error('Failed to parse cached translations', e);
        }
      }
    }

    // 2. Fetch fresh translations from API
    try {
      const response = await fetch(
        `${apiUrl}/v1/translations/${projectName}/${lang}`,
        {
          headers: {
            'x-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch translations: ${response.statusText}`);
      }

      const data = await response.json();
      setTranslations(data);

      // Save to local storage
      if (typeof window !== 'undefined' && cacheToLocalStorage) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error loading translations from Translation Platform:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, apiKey, projectName, cacheToLocalStorage, getCacheKey]);

  // Load translations on mount or when language changes
  useEffect(() => {
    loadTranslations(language);
  }, [language, loadTranslations]);

  // Change language function
  const changeLanguage = async (code: string) => {
    setLanguageState(code);
    if (typeof window !== 'undefined' && cacheToLocalStorage) {
      localStorage.setItem(`translation_lang:${projectName}`, code);
    }
  };

  // The translation function
  const t = useCallback((key: string, defaultValue: string): string => {
    const value = translations[key];

    if (value !== undefined) {
      return value;
    }

    // Key is missing! Return default value and register it in the background
    if (typeof window !== 'undefined' && !reportedKeysRef.current.has(key)) {
      reportedKeysRef.current.add(key);

      // Non-blocking background registration
      fetch(`${apiUrl}/v1/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          key,
          defaultValue,
          namespace: 'common',
        }),
      })
        .then((res) => {
          if (!res.ok) {
            console.warn(`Failed to auto-register missing translation key "${key}"`);
          }
        })
        .catch((err) => {
          console.error(`Error auto-registering missing translation key "${key}":`, err);
        });
    }

    return defaultValue;
  }, [translations, apiUrl, apiKey]);

  return (
    <TranslationContext.Provider value={{ t, language, changeLanguage, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
