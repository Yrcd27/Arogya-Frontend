import { LanguageSelector } from 'react-auto-google-translate';
import { GlobeIcon } from 'lucide-react';
import type { CSSObjectWithLabel, OptionProps } from 'react-select';

const specificLanguages = [
  { value: 'en', label: 'English', countryCode: 'gb' },
  { value: 'si', label: 'Sinhala', countryCode: 'lk' },
  { value: 'ta', label: 'Tamil', countryCode: 'lk' }
];

export function LandingLanguageSelector() {
  return (
    <div className="absolute bottom-6 right-6 z-20 notranslate rounded-lg border border-white/30 bg-slate-950/45 px-2 py-1.5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-white">
        <GlobeIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <LanguageSelector
          onlySpecificLanguages={specificLanguages}
          componentScale={0.8}
        menuPlacement="top"
        customStyles={{
          control: (base: CSSObjectWithLabel) => ({
            ...base,
            minHeight: '28px',
            border: 'none',
            boxShadow: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer'
          }),
          valueContainer: (base: CSSObjectWithLabel) => ({ ...base, padding: '0 3px' }),
          singleValue: (base: CSSObjectWithLabel) => ({ ...base, color: '#ffffff', fontSize: '0.8125rem', fontWeight: 600 }),
          dropdownIndicator: (base: CSSObjectWithLabel) => ({ ...base, color: '#ffffff', padding: '3px' }),
          indicatorSeparator: () => ({ display: 'none' }),
          menu: (base: CSSObjectWithLabel) => ({
            ...glassMenuStyles(base),
            bottom: '100%',
            top: 'auto',
            marginBottom: '8px'
          }),
          menuList: glassMenuListStyles,
          option: languageOptionStyles
        }}
        />
      </div>
    </div>
  );
}

type LanguageOption = (typeof specificLanguages)[number];

const languageOptionStyles = (base: CSSObjectWithLabel, state: OptionProps<LanguageOption, false>) => ({
  ...base,
  color: '#f8ffff',
  backgroundColor: state.isSelected
    ? 'rgba(56, 163, 165, 0.72)'
    : state.isFocused
      ? 'rgba(255, 255, 255, 0.12)'
      : 'transparent',
  cursor: 'pointer',
  fontSize: '0.875rem',
  ':active': {
    ...base[':active'],
    backgroundColor: 'rgba(56, 163, 165, 0.72)'
  }
});

const glassMenuStyles = (base: CSSObjectWithLabel) => ({
  ...base,
  backgroundColor: 'rgba(20, 48, 49, 0.94)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  borderRadius: '12px',
  boxShadow: '0 16px 32px rgba(8, 24, 25, 0.28)',
  overflow: 'hidden',
  backdropFilter: 'blur(16px)',
  zIndex: 9999
});

const glassMenuListStyles = (base: CSSObjectWithLabel) => ({
  ...base,
  padding: '4px',
  backgroundColor: 'transparent'
});

const dashboardOptionStyles = (base: CSSObjectWithLabel, state: OptionProps<LanguageOption, false>) => ({
  ...base,
  color: state.isSelected ? '#ffffff' : '#2d8284',
  backgroundColor: state.isSelected ? '#38a3a5' : state.isFocused ? '#e9f6f5' : '#ffffff',
  cursor: 'pointer',
  fontSize: '0.875rem',
  ':active': {
    ...base[':active'],
    backgroundColor: '#38a3a5'
  }
});

const dashboardMenuStyles = (base: CSSObjectWithLabel) => ({
  ...base,
  backgroundColor: '#ffffff',
  border: '1px solid rgba(56, 163, 165, 0.24)',
  borderRadius: '10px',
  boxShadow: '0 12px 24px rgba(15, 44, 45, 0.14)',
  overflow: 'hidden',
  zIndex: 9999
});

const dashboardMenuListStyles = (base: CSSObjectWithLabel) => ({
  ...base,
  padding: '4px',
  backgroundColor: '#ffffff'
});

export function HeaderLanguageSelector() {
  return (
    <div className="dashboard-language-selector flex items-center gap-2 rounded-lg border border-[#38A3A5]/25 bg-white px-2.5 py-1.5 shadow-sm notranslate">
      <GlobeIcon className="h-5 w-5 shrink-0 text-[#2d8284]" aria-hidden="true" />
      <div>
        <LanguageSelector
          onlySpecificLanguages={specificLanguages}
          componentScale={0.8} 
          menuPlacement="bottom"
          customStyles={{
            control: (base: CSSObjectWithLabel) => ({
              ...base,
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent',
              minHeight: '28px',
              cursor: 'pointer'
            }),
            valueContainer: (base: CSSObjectWithLabel) => ({
              ...base,
              padding: '0 3px',
            }),
            singleValue: (base: CSSObjectWithLabel) => ({
              ...base,
              color: '#2d8284',
              fontWeight: 600,
              fontSize: '0.875rem'
            }),
            dropdownIndicator: (base: CSSObjectWithLabel) => ({
              ...base, color: '#2d8284', padding: '3px'
            }),
            indicatorSeparator: () => ({ display: 'none' }),
            menu: (base: CSSObjectWithLabel) => ({
              ...dashboardMenuStyles(base), marginTop: '8px'
            }),
            menuList: dashboardMenuListStyles,
            option: dashboardOptionStyles
          }}
        />
      </div>
    </div>
  );
}
