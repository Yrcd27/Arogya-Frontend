import { useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageContent } from '../PageContent';
import { EmptyState } from '../EmptyState';
import { PaginationFooter } from '../PaginationFooter';
import { StaffDetailsModal } from './StaffDetailsModal';
import { StaffName } from './StaffName';
import { noTranslateClass, noTranslateProps } from '../../utils/noTranslate';
import { displayName, initials, speciality, value, type StaffKind, type StaffProfile } from '../../utils/staffProfile';
import { useAuth } from '../../hooks/useAuth';
import { useLinkedSearch } from '../../hooks/useLinkedSearch';
import { loadDoctorProfiles, loadTechnicianProfiles } from '../../utils/dashboard';
import type { DoctorProfile, TechnicianProfile } from '../../types/user';
import { ViewAction } from '../ViewAction';

const COPY: Record<StaffKind, { plural: string; title: string; speciality: string; fourth: string }> = {
  doctor: { plural: 'doctors', title: 'Doctors', speciality: 'Specialization', fourth: 'Experience' },
  technician: { plural: 'technicians', title: 'Technicians', speciality: 'Field', fourth: 'License number' },
};

function fourthColumn(profile: StaffProfile, kind: StaffKind): string {
  if (kind === 'technician') return value((profile as TechnicianProfile).licenseNumber);
  const years = (profile as DoctorProfile).experienceYears;
  return years == null ? value(null) : `${years} ${years === 1 ? 'year' : 'years'}`;
}

export function StaffListPage({ kind }: { kind: StaffKind }) {
  const { sessionKey } = useAuth();
  const copy = COPY[kind];
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const requestRef = useRef(0);
  useLinkedSearch(setSearchTerm);

  const load = async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await (kind === 'doctor' ? loadDoctorProfiles() : loadTechnicianProfiles());
      if (requestId !== requestRef.current) return;
      setProfiles(data);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setProfiles([]);
      setError(err instanceof Error ? err.message : `The ${copy.plural} could not be loaded. Please try again.`);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    setSelected(null);
    void loadRef.current();
    return () => { requestRef.current += 1; };
  }, [kind, sessionKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const sorted = [...profiles].sort((a, b) => displayName(a, kind).localeCompare(displayName(b, kind)));
  const terms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = terms.length
    ? sorted.filter(profile => {
      const text = `${displayName(profile, kind)} ${speciality(profile, kind)} ${profile.licenseNumber ?? ''} ${profile.phoneNumber ?? ''} ${profile.user?.email ?? ''}`.toLowerCase();
      return terms.every(term => text.includes(term));
    })
    : sorted;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const rows = visible.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isEmpty = !loading && !error && visible.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={isEmpty}>
          <div>
            <p className="mb-1 text-sm text-gray-600">Dashboard / {copy.title}</p>
            <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
            <p className="mt-1 text-sm text-gray-500">All registered {copy.plural}. Select View to see a profile's full details.</p>
          </div>

          {error && <div role="alert" className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{error}</div>}

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="search"
                  aria-label={`Search ${copy.plural}`}
                  placeholder={`Search ${copy.plural} by name, ${copy.speciality.toLowerCase()}, email or phone...`}
                  value={searchTerm}
                  maxLength={100}
                  autoComplete="off"
                  onChange={event => setSearchTerm(event.target.value)}
                  className="min-w-0 w-full flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#38A3A5]"
                />
              </div>
              {!loading && !error && sorted.length > 0 && (
                <p role="status" className="mt-3 text-sm text-gray-500">
                  {terms.length ? `${visible.length} of ${sorted.length} ${copy.plural}` : `${sorted.length} ${sorted.length === 1 ? copy.plural.slice(0, -1) : copy.plural}`}
                </p>
              )}
            </div>

            {loading ? (
              <div className="rounded-xl bg-white p-12 text-center text-gray-500 shadow-sm">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-[#38A3A5]" />
                <p className="mt-4">Loading {copy.plural}...</p>
              </div>
            ) : error ? null : sorted.length === 0 ? (
              <EmptyState variant="page" surface title={`No ${copy.plural} yet`} description={`No ${kind} profiles have been registered.`} />
            ) : visible.length === 0 ? (
              <EmptyState
                variant="page"
                surface
                title={`No ${copy.plural} match your search`}
                description="Try a different name, email or phone number."
                action={{ label: 'Clear search', onClick: () => setSearchTerm('') }}
              />
            ) : (
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Name', copy.speciality, 'Email', 'Phone', copy.fourth, 'Action'].map(heading => (
                          <th key={heading} className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rows.map(profile => {
                        const name = displayName(profile, kind);
                        return (
                          <tr key={profile.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span aria-hidden="true" {...noTranslateProps('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#38A3A5]/10 text-sm font-semibold text-[#2d8284]')}>{initials(name)}</span>
                                <span className="text-sm font-medium text-gray-900"><StaffName profile={profile} kind={kind} /></span>
                              </div>
                            </td>
                            <td translate="no" className={noTranslateClass('px-6 py-4 text-sm text-gray-700')}>{value(speciality(profile, kind))}</td>
                            <td translate="no" className={noTranslateClass('px-6 py-4 text-sm text-gray-700')}>{value(profile.user?.email)}</td>
                            <td translate="no" className={noTranslateClass('whitespace-nowrap px-6 py-4 text-sm text-gray-700')}>{value(profile.phoneNumber)}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">{fourthColumn(profile, kind)}</td>
                            <td className="px-6 py-4">
                              <ViewAction opensDialog label={`View details for ${name}`} onClick={() => setSelected(profile)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationFooter
                  currentPage={safePage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={visible.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={size => setPageSize(size)}
                />
              </div>
            )}
        </PageContent>
      </div>
      <StaffDetailsModal kind={kind} profile={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
