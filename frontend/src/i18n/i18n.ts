import en from './en.json';
import vi from './vi.json';
import { createContext, useContext } from 'react';
import { Language } from '../types';

const translations = { en, vi };
export type TranslationKey = keyof typeof en;

export function t(key: string, lang: Language, params?: Record<string, string | number>): string {
  let text = (translations[lang] as Record<string, string>)[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
  }
  return text;
}

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
}>({ language: 'en', setLanguage: () => {} });

export const useLanguage = () => useContext(LanguageContext);
