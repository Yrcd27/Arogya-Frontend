import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  type LanguageCode,
} from '../config/languages';
import {
  LanguageContext,
  type TranslationStatus,
} from './LanguageContextType';

const LANGUAGE_STORAGE_KEY = 'arogya.language';
const GOOGLE_SELECT_SELECTOR = '#google_translate_element select.goog-te-combo';
const GOOGLE_SCRIPT_ID = 'arogya-google-translate-script';
const GOOGLE_SCRIPT_SRC = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
const GOOGLE_WIDGET_TIMEOUT_MS = 8000;
const TRANSLATION_SETTLE_MS = 450;

function readCookieLanguage(): LanguageCode | null {
  const cookie = document.cookie
    .split('; ')
    .find(value => value.startsWith('googtrans='));
  const language = cookie?.split('=')[1]?.split('/').filter(Boolean).at(-1);
  return isLanguageCode(language) ? language : null;
}

function readStoredLanguage(): LanguageCode {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguageCode(storedLanguage)) return storedLanguage;
  } catch {
    return readCookieLanguage() ?? DEFAULT_LANGUAGE;
  }
  return readCookieLanguage() ?? DEFAULT_LANGUAGE;
}

function persistToLocalStorage(language: LanguageCode) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
  } catch {
    return false;
  }
}

function persistLanguage(language: LanguageCode) {
  void persistToLocalStorage(language);

  const expiredCookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  document.cookie = expiredCookie;
  const hostnameParts = window.location.hostname.split('.');
  for (let index = 0; index < hostnameParts.length - 1; index += 1) {
    const domain = hostnameParts.slice(index).join('.');
    document.cookie = `${expiredCookie}; domain=${domain}`;
    document.cookie = `${expiredCookie}; domain=.${domain}`;
  }

  if (language === DEFAULT_LANGUAGE) {
    return;
  }
  document.cookie = `googtrans=/en/${language}; path=/; SameSite=Lax`;
}

function getGoogleLanguageSelect() {
  return document.querySelector<HTMLSelectElement>(GOOGLE_SELECT_SELECTOR);
}

function waitForGoogleLanguageSelect(language: LanguageCode) {
  return new Promise<HTMLSelectElement>((resolve, reject) => {
    const findReadySelect = () => {
      const select = getGoogleLanguageSelect();
      if (!select) return null;
      if (language === DEFAULT_LANGUAGE) return select;
      return Array.from(select.options).some(option => option.value === language)
        ? select
        : null;
    };

    const readySelect = findReadySelect();
    if (readySelect) {
      resolve(readySelect);
      return;
    }

    const observer = new MutationObserver(() => {
      const select = findReadySelect();
      if (!select) return;
      window.clearTimeout(timeoutId);
      observer.disconnect();
      resolve(select);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error('Google Translate could not start. Check your connection or tracking prevention, then try again.'));
    }, GOOGLE_WIDGET_TIMEOUT_MS);
  });
}

function restoreGoogleOriginalLanguage() {
  try {
    window.google?.translate?.TranslateService?.getInstance().restore();
    return true;
  } catch {
    return false;
  }
}

function fireGoogleLanguageChange(select: HTMLSelectElement, language: LanguageCode) {
  if (language === DEFAULT_LANGUAGE) {
    void restoreGoogleOriginalLanguage();
    const originalLanguageOption = Array.from(select.options)
      .find(option => option.value === DEFAULT_LANGUAGE || option.value === '');
    if (originalLanguageOption) {
      select.value = originalLanguageOption.value;
    } else {
      select.selectedIndex = -1;
    }
    select.dispatchEvent(new Event('change', { bubbles: true }));
    window.setTimeout(() => {
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0);
    return;
  }

  select.value = language;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitForTranslationToSettle() {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, TRANSLATION_SETTLE_MS);
  });
}

function initializeGoogleWidget() {
  const host = document.getElementById('google_translate_element');
  const TranslateElement = window.google?.translate?.TranslateElement;
  if (!host || !TranslateElement || host.dataset.initialized === 'true') return;

  host.dataset.initialized = 'true';
  new TranslateElement({
    pageLanguage: DEFAULT_LANGUAGE,
    includedLanguages: 'en,si,ta',
    autoDisplay: false,
  }, host.id);
}

function loadGoogleWidget() {
  window.googleTranslateElementInit = initializeGoogleWidget;
  initializeGoogleWidget();

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    existingScript.addEventListener('load', initializeGoogleWidget, { once: true });
    return () => existingScript.removeEventListener('load', initializeGoogleWidget);
  }

  const script = document.createElement('script');
  script.id = GOOGLE_SCRIPT_ID;
  script.src = GOOGLE_SCRIPT_SRC;
  script.async = true;
  script.addEventListener('load', initializeGoogleWidget, { once: true });
  document.head.appendChild(script);
  return () => script.removeEventListener('load', initializeGoogleWidget);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [language, setLanguage] = useState<LanguageCode>(readStoredLanguage);
  const [status, setStatus] = useState<TranslationStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const languageRef = useRef(language);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const initialRouteRef = useRef(true);
  const interactiveChangeRef = useRef(false);

  const applyLanguage = useCallback(async (
    nextLanguage: LanguageCode,
    showProgress: boolean,
  ) => {
    const operationId = ++operationRef.current;
    if (showProgress) {
      setStatus('translating');
      setError(null);
    }

    try {
      const select = await waitForGoogleLanguageSelect(nextLanguage);
      if (!mountedRef.current || operationId !== operationRef.current) return false;

      fireGoogleLanguageChange(select, nextLanguage);
      await waitForTranslationToSettle();
      if (!mountedRef.current || operationId !== operationRef.current) return false;

      if (nextLanguage !== DEFAULT_LANGUAGE && select.value !== nextLanguage) {
        throw new Error('The selected language could not be applied. Please try again.');
      }

      persistLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage;
      languageRef.current = nextLanguage;
      setLanguage(nextLanguage);
      setStatus('ready');
      setError(null);
      return true;
    } catch (cause) {
      if (!mountedRef.current || operationId !== operationRef.current) return false;
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Translation failed. Please try again.');
      return false;
    }
  }, []);

  const changeLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    if (interactiveChangeRef.current) return false;
    if (nextLanguage === languageRef.current && status !== 'error') return true;
    interactiveChangeRef.current = true;
    try {
      return await applyLanguage(nextLanguage, true);
    } finally {
      interactiveChangeRef.current = false;
    }
  }, [applyLanguage, status]);

  useEffect(() => {
    mountedRef.current = true;
    const initialLanguage = languageRef.current;
    if (initialLanguage === DEFAULT_LANGUAGE && !readCookieLanguage()) {
      document.documentElement.lang = DEFAULT_LANGUAGE;
      setStatus('ready');
    } else {
      void applyLanguage(initialLanguage, false);
    }
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
    };
  }, [applyLanguage]);

  useEffect(() => loadGoogleWidget(), []);

  useEffect(() => {
    if (initialRouteRef.current) {
      initialRouteRef.current = false;
      return;
    }
    if (languageRef.current === DEFAULT_LANGUAGE) return;

    const timeoutId = window.setTimeout(() => {
      void applyLanguage(languageRef.current, false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [applyLanguage, location.key]);

  useEffect(() => {
    const syncLanguage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY || !isLanguageCode(event.newValue)) return;
      if (event.newValue === languageRef.current) return;
      void applyLanguage(event.newValue, true);
    };
    window.addEventListener('storage', syncLanguage);
    return () => window.removeEventListener('storage', syncLanguage);
  }, [applyLanguage]);

  useEffect(() => {
    if (document.getElementById('arogya-language-flags')) return;
    const stylesheet = document.createElement('link');
    stylesheet.id = 'arogya-language-flags';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.5.0/css/flag-icon.min.css';
    document.head.appendChild(stylesheet);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, status, error, changeLanguage }}>
      {children}
      <div id="google_translate_element" className="google-translate-host" aria-hidden="true" />
    </LanguageContext.Provider>
  );
}
