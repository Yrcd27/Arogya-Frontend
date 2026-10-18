import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, MenuIcon, SearchIcon } from 'lucide-react';
import { HeaderLanguageSelector } from './LanguageSelectors';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { isPositiveId } from '../utils/clinicalValidation';
import {
  SEARCH_PLACEHOLDERS,
  clearSearchCache,
  loadSearchData,
  matchesTerms,
  parseSearchTerms,
  searchRoleData,
  type SearchData,
  type SearchResult,
} from '../utils/headerSearch';

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
    { label: 'Clinics', path: '/admin/clinics', keywords: 'schedules assignments create edit' },
    { label: 'Doctors', path: '/admin/doctors', keywords: 'staff specialization license profiles directory' },
    { label: 'Technicians', path: '/admin/technicians', keywords: 'staff lab laboratory license profiles directory' },
  ],
};

interface DashboardHeaderProps {
  role: DashboardRole;
  onToggleSidebar?: () => void;
}

const resultLinkClass = 'flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-[#2d8284] focus-visible:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#38A3A5]';
const groupHeadingClass = 'px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400';

export function DashboardHeader({ role, onToggleSidebar }: DashboardHeaderProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<SearchData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, sessionKey } = useAuth();
  const { profile } = useUserProfile();
  const userId = user?.id;
  const profileId = profile?.id;
  const terms = parseSearchTerms(query);
  const showResults = isOpen && terms.length > 0;
  const shouldLoadData = showResults && isPositiveId(userId);

  const pageResults = terms.length
    ? pages[role].filter(page => matchesTerms(`${page.label} ${page.keywords}`, terms))
    : [];
  const dataResults = data && terms.length ? searchRoleData(role, data, terms) : [];
  const dataGroups = dataResults.reduce<{ name: string; items: SearchResult[] }[]>((groups, result) => {
    const group = groups.find(candidate => candidate.name === result.group);
    if (group) group.items.push(result);
    else groups.push({ name: result.group, items: [result] });
    return groups;
  }, []);
  const total = pageResults.length + dataResults.length;
  const firstTarget = pageResults[0]?.path ?? dataResults[0]?.to;
  const statusText = dataLoading && !data
    ? `Searching... ${pageResults.length ? `${pageResults.length} matching ${pageResults.length === 1 ? 'page' : 'pages'} so far.` : ''}`
    : `${total ? `${total} ${total === 1 ? 'match' : 'matches'}` : 'No matches found.'}${data?.unavailable.length ? ` Could not load: ${data.unavailable.join(', ')}.` : ''}`;

  useEffect(() => {
    setQuery('');
    setIsOpen(false);
  }, [location.key, role]);

  useEffect(() => {
    clearSearchCache();
    setData(null);
  }, [sessionKey, userId]);

  useEffect(() => {
    if (!shouldLoadData || userId === undefined) return;
    let current = true;
    setDataLoading(true);
    void loadSearchData(role, userId, profileId).then(result => {
      if (!current) return;
      setData(result);
      setDataLoading(false);
    });
    return () => { current = false; };
  }, [shouldLoadData, role, userId, profileId, sessionKey]);

  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [isOpen]);

  const closeSearch = () => {
    setIsOpen(false);
    setQuery('');
  };

  const moveFocus = (direction: 1 | -1) => {
    const links = Array.from(searchRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-search-result]') ?? []);
    if (!links.length) return;
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) {
      if (direction === 1) links[0].focus();
      return;
    }
    const next = index + direction;
    if (next < 0) inputRef.current?.focus();
    else if (next < links.length) links[next].focus();
  };

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
          } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && event.target instanceof HTMLAnchorElement) {
            event.preventDefault();
            moveFocus(event.key === 'ArrowDown' ? 1 : -1);
          }
        }}>
          <form role="search" aria-label="Search dashboard" onSubmit={event => {
            event.preventDefault();
            if (firstTarget) {
              closeSearch();
              navigate(firstTarget);
            }
          }}>
            <label htmlFor={resultsId + '-input'} className="sr-only">Search</label>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input ref={inputRef} id={resultsId + '-input'} type="search" value={query} autoComplete="off" maxLength={100} placeholder={SEARCH_PLACEHOLDERS[role]} aria-controls={showResults ? resultsId : undefined} className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500" onChange={event => {
              setQuery(event.target.value);
              setIsOpen(true);
            }} onFocus={() => setIsOpen(true)} onKeyDown={event => {
              if (event.key === 'ArrowDown' && total) {
                event.preventDefault();
                setIsOpen(true);
                moveFocus(1);
              }
            }} />
          </form>
          {showResults && (
            <div id={resultsId} className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <p role="status" className="px-2 py-1 text-xs text-gray-500">{statusText}</p>
              {pageResults.length > 0 && (
                <section aria-label="Matching pages">
                  <h3 className={groupHeadingClass}>Pages</h3>
                  <ul>
                    {pageResults.map(page => <li key={page.path}><Link to={page.path} data-search-result="" onClick={closeSearch} className={resultLinkClass + ' font-medium'}>
                      <span>{page.label}</span><ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#2d8284]" />
                    </Link></li>)}
                  </ul>
                </section>
              )}
              {dataGroups.map(group => (
                <section key={group.name} aria-label={group.name}>
                  <h3 className={groupHeadingClass}>{group.name}</h3>
                  <ul>
                    {group.items.map(result => <li key={result.key}><Link to={result.to} data-search-result="" onClick={closeSearch} className={resultLinkClass}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{result.label}</span>
                        <span className="block truncate text-xs text-gray-500">{result.detail}</span>
                      </span>
                      <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#2d8284]" />
                    </Link></li>)}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto shrink-0"><HeaderLanguageSelector /></div>
      </div>
    </header>
  );
}
