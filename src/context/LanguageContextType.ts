import { createContext } from 'react';
import type { LanguageCode } from '../config/languages';

export type TranslationStatus = 'loading' | 'ready' | 'translating' | 'error';

export interface LanguageContextType {
  language: LanguageCode;
  status: TranslationStatus;
  error: string | null;
  changeLanguage: (language: LanguageCode) => Promise<boolean>;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
