import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, MenuIcon, SearchIcon } from 'lucide-react';
import { HeaderLanguageSelector } from './LanguageSelectors';

type DashboardRole = 'patient' | 'doctor' | 'technician' | 'admin';

const pages: Record<DashboardRole, readonly { label: string; path: string; keywords: string }[]> = {
  patient: [
    { label: 'Dashboard', path: '/patient/dashboard', keywords: 'home health summary' },
    { label: 'My Profile', path: '/patient/profile', keywords: 'personal information details edit' },
    { label: 'Prescriptions', path: '/patient/records', keywords: 'consultations medical records history medicines' },
    { label: 'Lab Results', path: '/patient/lab-results', keywords: 'laboratory tests reports' },
    { label: 'Mobile Clinics', path: '/patient/clinics', keywords: 'queue join schedules appointments' },
  ],
  doctor: [
    { label: 'Dashboard', path: '/doctor/dashboard', keywords: 'home summary' },
    { label: 'My Profile', path: '/doctor/profile', keywords: 'personal information details edit' },
    { label: 'Patient Queue', path: '/doctor/queue', keywords: 'clinics waiting patients tokens' },
    { label: 'Consultations', path: '/doctor/consultations', keywords: 'medical records history prescriptions' },
  ],
  technician: [
    { label: 'Dashboard', path: '/technician/dashboard', keywords: 'home summary' },
    { label: 'My Profile', path: '/technician/profile', keywords: 'personal information details edit' },
    { label: 'Lab Tests', path: '/technician/lab-tests', keywords: 'laboratory worklist results reports' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', keywords: 'home summary' },
    { label: 'My Profile', path: '/admin/profile', keywords: 'personal information details edit' },
    { label: 'Clinics', path: '/admin/clinics', keywords: 'schedules assignments doctors create edit' },
  ],
};

interface DashboardHeaderProps {
  role: DashboardRole;
  onToggleSidebar?: () => void;
}

export function DashboardHeader({ role, onToggleSidebar }: DashboardHeaderProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = terms.length ? pages[role].filter(page =>
    terms.every(term => `${page.label} ${page.keywords}`.toLowerCase().includes(term))) : [];
  const showResults = isOpen && terms.length > 0;

  useEffect(() => {
    setQuery('');
    setIsOpen(false);
  }, [location.key, role]);

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button type="button" onClick={onToggleSidebar} aria-label="Toggle navigation" title="Toggle navigation" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
          <MenuIcon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <div ref={searchRef} className="relative min-w-0 flex-1 sm:max-w-md" onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
        }} onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            inputRef.current?.focus();
            setIsOpen(false);
          }
        }}>
          <form role="search" aria-label="Search dashboard pages" onSubmit={event => {
            event.preventDefault();
            if (results[0]) {
              setIsOpen(false);
              setQuery('');
              navigate(results[0].path);
            }
          }}>
            <label htmlFor={resultsId + '-input'} className="sr-only">Search pages</label>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input ref={inputRef} id={resultsId + '-input'} type="search" value={query} autoComplete="off" maxLength={100} placeholder="Search pages..." aria-controls={showResults ? resultsId : undefined} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500" onChange={event => {
              setQuery(event.target.value);
              setIsOpen(true);
            }} onFocus={() => setIsOpen(true)} onKeyDown={event => {
              if (event.key === 'ArrowDown' && results.length) {
                event.preventDefault();
                setIsOpen(true);
                window.requestAnimationFrame(() => searchRef.current?.querySelector<HTMLAnchorElement>('a')?.focus());
              }
            }} />
          </form>
          {showResults && (
            <div id={resultsId} className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <p role="status" className="px-2 py-1 text-xs text-gray-500">{results.length ? `${results.length} matching ${results.length === 1 ? 'page' : 'pages'}` : 'No matching pages.'}</p>
              <ul aria-label="Matching pages">
                {results.map(page => <li key={page.path}><Link to={page.path} onClick={() => { setIsOpen(false); setQuery(''); }} className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-[#2d8284] focus-visible:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38A3A5]">
                  <span>{page.label}</span><ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#2d8284]" />
                </Link></li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="ml-auto shrink-0"><HeaderLanguageSelector /></div>
      </div>
    </header>
  );
}
