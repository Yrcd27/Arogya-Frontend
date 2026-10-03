import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { CheckIcon, ChevronDownIcon, GlobeIcon, LoaderCircleIcon } from 'lucide-react';
import { specificLanguages, type LanguageCode } from '../config/languages';
import { useLanguage } from '../hooks/useLanguage';

type SelectorVariant = 'landing' | 'header';

interface LanguageSelectorProps {
  variant: SelectorVariant;
}

function LanguageFlag({ countryCode }: { countryCode: string }) {
  return (
    <span
      className={`flag-icon flag-icon-${countryCode} inline-block h-3.5 w-5 shrink-0 rounded-sm bg-gray-100`}
      aria-hidden="true"
    />
  );
}

function SharedLanguageSelector({ variant }: LanguageSelectorProps) {
  const { language, status, error, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedLanguage, setFailedLanguage] = useState<LanguageCode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const isBusy = status === 'loading' || status === 'translating';
  const selectedLanguage = specificLanguages.find(option => option.value === language)
    ?? specificLanguages[0];

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const openMenu = useCallback(() => {
    const selectedIndex = specificLanguages.findIndex(option => option.value === language);
    setActiveIndex(Math.max(0, selectedIndex));
    setIsOpen(true);
  }, [language]);

  useEffect(() => {
    if (!isOpen) return;
    const focusId = window.requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      window.cancelAnimationFrame(focusId);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeIndex, closeMenu, isOpen]);

  const selectLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    if (isBusy) return;
    setFailedLanguage(null);
    const applied = await changeLanguage(nextLanguage);
    if (applied) {
      closeMenu(true);
      return;
    }
    setFailedLanguage(nextLanguage);
  }, [changeLanguage, closeMenu, isBusy]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (activeIndex + direction + specificLanguages.length)
        % specificLanguages.length;
      setActiveIndex(nextIndex);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : specificLanguages.length - 1);
    }
  };

  const triggerClasses = variant === 'landing'
    ? 'h-11 w-56 rounded-xl border border-white/30 bg-slate-950/45 px-3 text-white shadow-lg backdrop-blur-sm hover:bg-slate-950/55 focus-visible:ring-white/80'
    : 'h-9 w-9 rounded-lg text-[#2d8284] hover:bg-gray-100 focus-visible:ring-[#38A3A5]';
  const menuClasses = variant === 'landing'
    ? 'bottom-full right-0 mb-2 border-white/20 bg-[rgba(20,48,49,0.94)] text-white shadow-[0_16px_32px_rgba(8,24,25,0.28)] backdrop-blur-xl'
    : 'right-0 top-full mt-2 border-[#38A3A5]/25 bg-white text-[#2d8284] shadow-[0_12px_24px_rgba(15,44,45,0.14)]';

  return (
    <div ref={containerRef} className="relative notranslate">
      <button
        ref={triggerRef}
        type="button"
        className={`flex shrink-0 items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${triggerClasses}`}
        aria-label={`Change language. Current language: ${selectedLanguage.label}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-busy={isBusy}
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={event => {
          if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        {isBusy
          ? <LoaderCircleIcon className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
          : <GlobeIcon className="h-5 w-5 shrink-0" aria-hidden="true" />}
        {variant === 'landing' && (
          <>
            <LanguageFlag countryCode={selectedLanguage.countryCode} />
            <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold">
              {selectedLanguage.label}
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </>
        )}
        <span className="sr-only" aria-live="polite">
          {isBusy ? 'Changing language' : ''}
        </span>
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Choose language"
          className={`absolute z-[9999] w-48 overflow-hidden rounded-xl border p-1 ${menuClasses}`}
          onKeyDown={handleMenuKeyDown}
        >
          {specificLanguages.map((option, index) => {
            const isSelected = option.value === language;
            const optionClasses = variant === 'landing'
              ? isSelected
                ? 'bg-[#38A3A5]/75 text-white'
                : 'text-white hover:bg-white/10 focus:bg-white/10'
              : isSelected
                ? 'bg-[#38A3A5] text-white'
                : 'text-[#2d8284] hover:bg-[#e9f6f5] focus:bg-[#e9f6f5]';
            return (
              <button
                key={option.value}
                ref={element => { optionRefs.current[index] = element; }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={index === activeIndex ? 0 : -1}
                disabled={isBusy}
                className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium outline-none transition-colors disabled:cursor-wait disabled:opacity-60 ${optionClasses}`}
                onFocus={() => setActiveIndex(index)}
                onClick={() => void selectLanguage(option.value)}
              >
                <LanguageFlag countryCode={option.countryCode} />
                <span className="flex-1">{option.label}</span>
                {isSelected && <CheckIcon className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}

          {status === 'error' && error && (
            <div className={`mt-1 border-t px-2 py-2 text-xs ${variant === 'landing' ? 'border-white/15 text-white' : 'border-gray-100 text-gray-600'}`} role="alert">
              <p>{error}</p>
              {failedLanguage && (
                <button
                  type="button"
                  className={`mt-1 font-semibold underline underline-offset-2 ${variant === 'landing' ? 'text-white' : 'text-[#2d8284]'}`}
                  onClick={() => void selectLanguage(failedLanguage)}
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LandingLanguageSelector() {
  return (
    <div className="absolute bottom-6 right-6 z-20">
      <SharedLanguageSelector variant="landing" />
    </div>
  );
}

export function HeaderLanguageSelector() {
  return <SharedLanguageSelector variant="header" />;
}
