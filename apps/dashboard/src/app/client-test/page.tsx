'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TranslationProvider, useTranslation } from '@translation-platform/sdk-react';
import { Globe, ArrowLeft, Layers, RefreshCcw } from 'lucide-react';

function ClientTestContent() {
  const { t, language, changeLanguage, isLoading } = useTranslation();
  const [showExtra, setShowExtra] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6">
      {/* Back to admin link */}
      <Link 
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-all bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-800/80"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin Dashboard
      </Link>

      <div className="w-full max-w-lg glass p-8 rounded-2xl border border-slate-900 shadow-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {t("client.title", "Centralized Translations")}
          </h1>
          <p className="text-sm text-slate-400">
            {t("client.welcome", "This page simulates an external website integrating the Translation SDK.")}
          </p>
        </div>

        {/* Translation Demonstration */}
        <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-900">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">SDK Translation Output</span>
            {isLoading ? (
              <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <RefreshCcw className="w-3 h-3 animate-spin" /> Fetching...
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Active & Cached
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-slate-500 font-mono">key: client.title</p>
              <p className="text-sm font-medium text-slate-200">{t("client.title", "Centralized Translations")}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono">key: client.welcome</p>
              <p className="text-sm text-slate-300">{t("client.welcome", "This page simulates an external website integrating the Translation SDK.")}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono">key: client.button_action</p>
              <button 
                onClick={() => setShowExtra(!showExtra)}
                className="mt-1 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-xs rounded-lg text-slate-200 transition-all cursor-pointer"
              >
                {t("client.button_action", "Toggle Extra Content")}
              </button>
            </div>

            {/* Dynamic key registration demonstration */}
            {showExtra && (
              <div className="mt-4 pt-4 border-t border-slate-900/60 animate-fadeIn">
                <p className="text-[10px] text-amber-500 font-mono flex items-center gap-1">
                  <span>key: client.extra_text</span>
                  <span className="bg-amber-500/10 px-1 py-0.2 rounded text-[8px]">Auto-Registered!</span>
                </p>
                <p className="text-sm text-amber-200 font-medium">
                  {t("client.extra_text", "Congrats! Rendering this text just registered a new key in the database in the background.")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-3">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-500" />
            Switch Language
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'en', label: 'English' },
              { code: 'de', label: 'Deutsch' },
              { code: 'fr', label: 'Français' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`py-2 px-4 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  language === lang.code
                    ? 'bg-brand-600/15 border-brand-500/30 text-brand-400 shadow-[0_0_12px_rgba(37,99,235,0.1)]'
                    : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientTestPage() {
  return (
    <TranslationProvider
      config={{
        apiUrl: 'http://localhost:3001',
        apiKey: 'klarwein-test-api-key-12345',
        projectName: 'Klarwein',
        defaultLanguage: 'en',
        fallbackLanguage: 'en',
        cacheToLocalStorage: true,
      }}
    >
      <ClientTestContent />
    </TranslationProvider>
  );
}
