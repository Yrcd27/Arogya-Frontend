import { LanguageSelector } from 'react-auto-google-translate';
import { GlobeIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { specificLanguages } from '../config/languages';

type StyleBase = Record<string, string | number | undefined>;
type OptionState = { isSelected: boolean; isFocused: boolean };

export function GlobalLanguageSelector() {
  const location = useLocation();
  // Only show on public routes (landing, login, role selection, register)
  const isPublicRoute = ['/', '/login', '/role-selection'].includes(location.pathname) || location.pathname.startsWith('/register');
  
  if (!isPublicRoute) return null;

  return (
    <div className="fixed bottom-8 left-4 z-[9999] notranslate">
      <LanguageSelector 
        onlySpecificLanguages={specificLanguages} 
        componentScale={0.8} 
        menuPlacement="top"
        customStyles={{
          menu: (base: StyleBase) => ({
            ...base,
            bottom: '100%',
            top: 'auto',
            marginBottom: '8px'
          })
        }}
      />
    </div>
  );
}

export function SidebarLanguageSelector() {
  return (
    <div className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 text-gray-700 rounded-lg transition-colors notranslate">
      <GlobeIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-700" />
      <div className="flex-1">
        <LanguageSelector 
          onlySpecificLanguages={specificLanguages} 
          componentScale={0.8} 
          menuPlacement="top"
          customStyles={{
            control: (base: StyleBase) => ({
              ...base,
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent',
              minHeight: 'auto',
              cursor: 'pointer'
            }),
            valueContainer: (base: StyleBase) => ({
              ...base,
              padding: '0 8px',
            }),
            singleValue: (base: StyleBase) => ({
              ...base,
              color: '#374151',
              fontWeight: 500,
              fontSize: '0.875rem' // text-sm
            }),
            dropdownIndicator: (base: StyleBase) => ({
              ...base,
              color: '#9CA3AF', // gray-400
              padding: '4px'
            }),
            indicatorSeparator: () => ({ display: 'none' }),
            menu: (base: StyleBase) => ({
              ...base,
              bottom: '100%',
              top: 'auto',
              marginBottom: '8px',
              zIndex: 9999
            }),
            option: (base: StyleBase, state: OptionState) => ({
              ...base,
              fontSize: '0.875rem',
              color: state.isSelected ? '#ffffff' : '#374151',
              backgroundColor: state.isSelected ? '#38a3a5' : state.isFocused ? '#f3f4f6' : 'transparent',
              cursor: 'pointer'
            })
          }}
        />
      </div>
    </div>
  );
}
