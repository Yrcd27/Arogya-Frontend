/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface GoogleTranslateElementOptions {
  pageLanguage: string;
  includedLanguages: string;
  autoDisplay: boolean;
}

type GoogleTranslateElementConstructor = new (
  options: GoogleTranslateElementOptions,
  elementId: string,
) => unknown;

interface GoogleTranslateService {
  restore: () => void;
}

interface GoogleTranslateServiceFactory {
  getInstance: () => GoogleTranslateService;
}

interface Window {
  google?: {
    translate?: {
      TranslateElement?: GoogleTranslateElementConstructor;
      TranslateService?: GoogleTranslateServiceFactory;
    };
  };
  googleTranslateElementInit?: () => void;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
