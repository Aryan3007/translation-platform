import React from 'react';
import type { TranslationConfig, TranslationContextValue } from './types';
export type { TranslationConfig, TranslationContextValue, TranslationVars } from './types';
export declare const TranslationProvider: React.FC<{
    config: TranslationConfig;
    children: React.ReactNode;
}>;
export declare function useTranslation(): TranslationContextValue;
