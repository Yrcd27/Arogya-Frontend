import { PageContent } from '../../components/PageContent';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLinkedSearch } from '../../hooks/useLinkedSearch';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { SubmitTestResultModal } from '../../components/technician/SubmitTestResultModal';
import { TestResultDetailsModal } from '../../components/technician/TestResultDetailsModal';
import { EditTestResultModal } from '../../components/technician/EditTestResultModal';
import { labTestAPI } from '../../services/labTestService';
import { medicalRecordsAPI, type TestResult } from '../../services/medicalRecordsService';
import { consultationAPI } from '../../services/consultationService';
import { profileAPI, userAPI } from '../../services/userService';
import { LabTest } from '../../types/labTest';
import { FlaskConical, Play, Search, UserRoundCheck } from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ApiError } from '../../services/httpClient';
import { StatusBadge } from '../../components/StatusBadge';
import { PaginationFooter } from '../../components/PaginationFooter';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { isPositiveId } from '../../utils/clinicalValidation';
import { Select } from '../../components/Select';

type ResultAvailability = 'checking' | 'present' | 'absent' | 'error';

export function LabTests() {
  const { sessionKey } = useAuth();
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;
  const { profile, status: profileStatus } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  useLinkedSearch(setSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [testToSubmit, setTestToSubmit] = useState<LabTest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResult, setEditingResult] = useState<TestResult | null>(null);
  const [patientByConsultation, setPatientByConsultation] = useState<Record<number, { patientId: number; name: string }>>({});
  const [resultAvailabilityByLabTest, setResultAvailabilityByLabTest] = useState<Record<number, ResultAvailability>>({});
  const [resultAvailabilityErrors, setResultAvailabilityErrors] = useState<Record<number, string>>({});
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const loadLabTestsRef = useRef<() => Promise<void>>(async () => undefined);
  const consultationCacheRef = useRef<Map<number, Promise<{ patientId: number; name: string }>>>(new Map());
  const checkedResultsRef = useRef<Set<number>>(new Set());
  const resultChecksInFlightRef = useRef<Set<number>>(new Set());
  const listRequestRef = useRef(0);
  const actionRef = useRef(false);
  const hydrateResultPresenceRef = useRef<(tests: LabTest[]) => Promise<void>>(async () => undefined);
  const canFilterAssignedToMe = profileStatus === 'ready' && isPositiveId(profile?.id);

  useEffect(() => {
    currentSessionRef.current = sessionKey;
    setShowSubmitModal(false);
    setShowEditModal(false);
    setShowDetailsModal(false);
    setTestToSubmit(null);
    setSelectedTest(null);
    setEditingResult(null);
    setPatientByConsultation({});
    consultationCacheRef.current.clear();
    void loadLabTestsRef.current();
    return () => { listRequestRef.current += 1; currentSessionRef.current = -1; };
  }, [sessionKey]);

  const loadLabTests = async () => {
    const requestId = ++listRequestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === listRequestRef.current && currentSessionRef.current === requestSession;
    setLoading(true);
    setError('');
    try {
      const pageSize = 200;
      let page = 0;
      let data: LabTest[] = [];
      for (;;) {
        const { items, total } = await labTestAPI.list({ page, size: pageSize });
        if (!isCurrent()) return;
        data = data.concat(items);
        if (items.length === 0 || data.length >= total) break;
        page += 1;
      }
      checkedResultsRef.current.clear();
      resultChecksInFlightRef.current.clear();
      setResultAvailabilityByLabTest({});
      setResultAvailabilityErrors({});
      setLabTests(data);
      void hydratePatientDetails(data, isCurrent);
    } catch (err) {
      if (!isCurrent()) return;
      setError('Failed to load lab tests');
      console.error(err);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  loadLabTestsRef.current = loadLabTests;

  const hydratePatientDetails = async (tests: LabTest[], isCurrent: () => boolean) => {
    const consultationIds = Array.from(new Set(tests.map(t => t.consultationId)));
    const missing = consultationIds.filter(id => !patientByConsultation[id]);
    if (missing.length === 0) return;

    // Use promise cache to eliminate redundant consultation and patient lookups (N+1 defense)
    const promises = missing.map((consultationId) => {
      const cached = consultationCacheRef.current.get(consultationId);
      if (cached) return cached.then(result => ({ ...result, consultationId }));
      const promise = (async () => {
        try {
          const consultation = await consultationAPI.get(consultationId);
          if (!isCurrent()) return { consultationId, patientId: 0, name: '-' };
          const patientId = consultation.patientId;

          try {
            const profile = await profileAPI.getPatient(patientId);
            const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
            if (name) return { consultationId, patientId, name };
          } catch {
            // Fallback to user service below.
          }

          try {
            if (!isCurrent()) return { consultationId, patientId: 0, name: '-' };
            const user = await userAPI.getUser(patientId);
            const name = user?.username || `Patient #${patientId}`;
            return { consultationId, patientId, name };
          } catch {
            return { consultationId, patientId, name: `Patient #${patientId}` };
          }
        } catch {
          return { consultationId, patientId: 0, name: '-' };
        }
      })();
      consultationCacheRef.current.set(consultationId, promise);
      return promise;
    });

    const results = await Promise.all(promises);
    const next: Record<number, { patientId: number; name: string }> = {};
    results.forEach((r) => {
      next[r.consultationId] = { patientId: r.patientId, name: r.name };
    });
    if (isCurrent()) setPatientByConsultation(prev => ({ ...prev, ...next }));
  };

  const hydrateResultPresence = async (tests: LabTest[], forceRetry = false) => {
    const requestId = listRequestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === listRequestRef.current && currentSessionRef.current === requestSession;
    // Only check results for tests that haven't been verified yet
    const candidateIds = tests
      .filter(t => (t.status === 'PENDING' || t.status === 'IN_PROGRESS') && !resultChecksInFlightRef.current.has(t.id) && (forceRetry || !checkedResultsRef.current.has(t.id)))
      .map(t => t.id);
    if (candidateIds.length === 0) return;

    candidateIds.forEach(id => checkedResultsRef.current.add(id));
    candidateIds.forEach(id => resultChecksInFlightRef.current.add(id));

    setResultAvailabilityByLabTest(previous => ({
      ...previous,
      ...Object.fromEntries(candidateIds.map(id => [id, 'checking' as ResultAvailability])),
    }));
    setResultAvailabilityErrors(previous => {
      const next = { ...previous };
      candidateIds.forEach(id => delete next[id]);
      return next;
    });

    // Check with small batches of 3 to avoid query spikes
    const batchSize = 3;
    for (let i = 0; i < candidateIds.length; i += batchSize) {
      if (!isCurrent()) return;
      const batch = candidateIds.slice(i, i + batchSize);
      const checks = await Promise.all(
        batch.map(async (labTestId) => {
          try {
            const result = await medicalRecordsAPI.getByLabTestId(labTestId);
            if (!isPositiveId(result?.id) || result.labTestId !== labTestId) throw new Error('The result response could not be verified.');
            return { labTestId, availability: 'present' as const };
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) return { labTestId, availability: 'absent' as const };
            return {
              labTestId,
              availability: 'error' as const,
              message: err instanceof Error ? err.message : 'Unable to verify whether a result already exists.',
            };
          }
        })
      );
      if (!isCurrent()) return;
      batch.forEach(id => resultChecksInFlightRef.current.delete(id));

      const next: Record<number, ResultAvailability> = {};
      const nextErrors: Record<number, string> = {};
      checks.forEach(({ labTestId, availability, ...result }) => {
        next[labTestId] = availability;
        if ('message' in result && result.message) nextErrors[labTestId] = result.message;
      });
      setResultAvailabilityByLabTest(prev => ({ ...prev, ...next }));
      setResultAvailabilityErrors(prev => ({ ...prev, ...nextErrors }));
    }
  };

  hydrateResultPresenceRef.current = hydrateResultPresence;

  const filteredTests = useMemo(() => {
    let filtered = labTests;

    if (assignedToMeOnly) {
      filtered = canFilterAssignedToMe
        ? filtered.filter(test => test.assignedTechnicianId === profile?.id) : [];
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(test => test.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(test =>
        test.testName.toLowerCase().includes(term) ||
        test.id.toString().includes(term) ||
        test.consultationId.toString().includes(term) ||
        (patientByConsultation[test.consultationId]?.name || '').toLowerCase().includes(term) ||
        (patientByConsultation[test.consultationId]?.patientId?.toString() || '').includes(term)
      );
    }

    return filtered;
  }, [assignedToMeOnly, canFilterAssignedToMe, labTests, patientByConsultation, profile?.id, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [assignedToMeOnly, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTests = filteredTests.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (!loading && paginatedTests.length > 0) {
      void hydrateResultPresenceRef.current(paginatedTests);
    }
  }, [loading, paginatedTests]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleTakeTest = async (test: LabTest) => {
    if (actionRef.current) return;
    if (!isPositiveId(test.id) || !isPositiveId(profile?.id) || profileStatus !== 'ready') {
      setError('Your technician profile or the selected test could not be verified. Refresh before continuing.');
      return;
    }
    if (test.assignedTechnicianId && test.assignedTechnicianId !== profile?.id) {
      setActionErrors(previous => ({ ...previous, [test.id]: 'This test is assigned to another technician.' }));
      return;
    }
    const resultAvailability = resultAvailabilityByLabTest[test.id] ?? 'checking';
    if (resultAvailability === 'present') {
      handleViewDetails(test);
      return;
    }
    if (resultAvailability !== 'absent') {
      setActionErrors(previous => ({
        ...previous,
        [test.id]: resultAvailability === 'error'
          ? 'Verify result availability before submitting a result.'
          : 'Checking result availability. Please wait.',
      }));
      return;
    }
    if (test.status === 'IN_PROGRESS') {
      setTestToSubmit(test);
      setShowSubmitModal(true);
      return;
    }
    if (!profile?.id) {
      setError('Your technician profile has not loaded yet. Please refresh before continuing.');
      return;
    }
    if (actionLoadingId !== null) return;
    if (test.status !== 'PENDING') return;
    const requestSession = sessionKey;
    actionRef.current = true;
    setActionLoadingId(test.id);
    setActionErrors(previous => {
      const next = { ...previous };
      delete next[test.id];
      return next;
    });
    let assigned = false;
    try {
      if (test.assignedTechnicianId && test.assignedTechnicianId !== profile.id) {
        throw new Error('This test is assigned to another technician.');
      }
      if (test.assignedTechnicianId !== profile.id) {
        await labTestAPI.assign(test.id, profile.id);
        if (currentSessionRef.current !== requestSession) return;
        assigned = true;
      }
      const started = await labTestAPI.start(test.id);
      if (currentSessionRef.current !== requestSession) return;
      if (started.id !== test.id || started.consultationId !== test.consultationId || started.status !== 'IN_PROGRESS') throw new Error('The server did not confirm this test as in progress. Refresh the worklist.');
      setLabTests(prev => prev.map(t => (t.id === test.id ? started : t)));
      setTestToSubmit(started);
      setShowSubmitModal(true);
    } catch (err) {
      if (currentSessionRef.current !== requestSession) return;
      setActionErrors(previous => ({
        ...previous,
        [test.id]: assigned
          ? 'The test was assigned, but could not be started. Refresh and continue from its current server status.'
          : err instanceof Error ? err.message : 'Failed to start test',
      }));
      await loadLabTests();
    } finally {
      actionRef.current = false;
      setActionLoadingId(null);
    }
  };

  const handleSubmitSuccess = () => {
    // The medical-records service marks the lab test COMPLETED itself once
    // a result is attached, so there's nothing further to update here.
    setShowSubmitModal(false);
    setTestToSubmit(null);
    loadLabTests();
  };

  const handleViewDetails = (test: LabTest) => {
    setSelectedTest(test);
    setShowDetailsModal(true);
  };

  const handleEdit = (result: TestResult) => {
    setEditingResult(result);
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  const handleDelete = async (resultId: number) => {
    if (!isPositiveId(resultId)) throw new Error('The selected result could not be verified. Reopen it before deleting.');
    const requestSession = sessionKey;
    await medicalRecordsAPI.delete(resultId);
    if (currentSessionRef.current !== requestSession) return;
    setShowDetailsModal(false);
    setSelectedTest(null);
    await loadLabTests();
  };

  const handleRetake = async () => {
    setShowDetailsModal(false);
    setSelectedTest(null);
    await loadLabTests();
  };

  const handleEditSuccess = () => {
    loadLabTests();
    setShowEditModal(false);
    setEditingResult(null);
  };

  const statusCounts = {
    ALL: labTests.length,
    PENDING: labTests.filter(t => t.status === 'PENDING').length,
    IN_PROGRESS: labTests.filter(t => t.status === 'IN_PROGRESS').length,
    COMPLETED: labTests.filter(t => t.status === 'COMPLETED').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={!loading && !error && !(assignedToMeOnly && !canFilterAssignedToMe) && filteredTests.length === 0}>
          <div>
            <p className="mb-1 text-sm text-gray-600">Dashboard / Lab Tests</p>
            <h1 id="lab-tests-heading" className="text-2xl font-bold text-gray-900 sm:text-3xl">Lab Tests</h1>
          </div>

          <section aria-label="Lab test filters" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  aria-label="Search lab tests"
                  placeholder="Search by test name, patient, ID, or consultation ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white py-1 pl-10 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#38A3A5]"
                />
              </div>
              <Select
                aria-label="Filter lab tests by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full shrink-0 sm:w-52"
              >
                <option value="ALL">All Status ({statusCounts.ALL})</option>
                <option value="PENDING">Pending ({statusCounts.PENDING})</option>
                <option value="IN_PROGRESS">In Progress ({statusCounts.IN_PROGRESS})</option>
                <option value="COMPLETED">Completed ({statusCounts.COMPLETED})</option>
              </Select>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-800">
                <UserRoundCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-[#2d8284]" />
                <span>Assigned to me</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={assignedToMeOnly}
                aria-label="Show only lab tests assigned to me"
                disabled={!canFilterAssignedToMe}
                onClick={() => setAssignedToMeOnly(value => !value)}
                className={[
                  'inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed',
                  assignedToMeOnly ? 'bg-[#38A3A5]' : 'bg-gray-300',
                  !canFilterAssignedToMe ? 'bg-gray-200' : '',
                ].join(' ')}
              >
                <span aria-hidden="true" className={'h-4 w-4 rounded-full bg-white shadow-sm transition-transform ' + (assignedToMeOnly ? 'translate-x-4' : 'translate-x-0')} />
              </button>
              {!canFilterAssignedToMe && <p role="status" className="basis-full text-sm text-gray-600">{profileStatus === 'loading' ? 'Verifying your technician profile before assignment filtering is available.' : 'Your technician profile could not be verified. Assignment filtering is unavailable, and all tests remain visible.'}</p>}
            </div>
          </section>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-gray-600">Loading lab tests...</div>
            </div>
          ) : error || assignedToMeOnly && !canFilterAssignedToMe ? null : filteredTests.length === 0 ? (
            <EmptyState variant="page" surface icon={<FlaskConical />}
              title={labTests.length === 0 ? 'No lab tests yet' : 'No matching lab tests'}
              description={labTests.length === 0 ? 'Lab orders will appear here when they are available.' : 'Try adjusting your search, status, or assignment filters.'} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Test Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created At</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedTests.map((test) => {
                      const displayStatus = test.status;
                      const resultAvailability = resultAvailabilityByLabTest[test.id]
                        ?? (displayStatus === 'PENDING' || displayStatus === 'IN_PROGRESS' ? 'checking' : 'present');
                      return (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4"><span className="text-sm font-medium text-gray-900">{test.testName}</span></td>
                        <td className="px-6 py-4">
                          {patientByConsultation[test.consultationId]?.name ? (
                            <span className="text-sm text-gray-700">{patientByConsultation[test.consultationId]?.name}</span>
                          ) : (
                            <span className="inline-block bg-gray-200 animate-pulse rounded h-4 w-24" />
                          )}
                          <div className="text-xs text-gray-400">Test #{test.id} · Consultation #{test.consultationId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={displayStatus} />
                          {resultAvailability === 'present' && displayStatus !== 'COMPLETED' && (
                            <span className="ml-2 text-xs text-amber-700">Result recorded</span>
                          )}
                          {resultAvailability === 'error' && (
                            <span className="ml-2 text-xs text-red-700">Result availability unknown</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{formatDateTime(test.createdAt)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {displayStatus === 'COMPLETED' || resultAvailability === 'present' ? (
                            <button
                              onClick={() => handleViewDetails(test)}
                              className="text-[#38A3A5] hover:text-[#2d8284] font-medium text-sm"
                            >
                              View Result
                            </button>
                          ) : resultAvailability === 'checking' ? (
                            <button
                              type="button"
                              disabled
                              className="px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium text-gray-600"
                            >
                              Checking result...
                            </button>
                          ) : resultAvailability === 'error' ? (
                            <button
                              type="button"
                              onClick={() => void hydrateResultPresence([test], true)}
                              className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50"
                            >
                              Retry check
                            </button>
                          ) : displayStatus === 'IN_PROGRESS' || displayStatus === 'PENDING' ? (
                            <button
                              onClick={() => handleTakeTest(test)}
                              disabled={actionLoadingId !== null || !!(showSubmitModal && testToSubmit && testToSubmit.id === test.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${actionLoadingId !== null || showSubmitModal && testToSubmit && testToSubmit.id === test.id ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-[#38A3A5] text-white hover:bg-[#2d8284]'}`}
                            >
                              <Play className="w-4 h-4" />
                              Take Test
                            </button>
                          ) : null}
                          {(actionErrors[test.id] || resultAvailabilityErrors[test.id]) && (
                            <p className="mt-2 max-w-xs text-xs text-red-700">
                              {actionErrors[test.id] || resultAvailabilityErrors[test.id]}
                            </p>
                          )}
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
                totalItems={filteredTests.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
              />
            </div>
          )}
        </PageContent>
      </div>

      {/* Test Result Details Modal */}
      {showDetailsModal && selectedTest && (
        <TestResultDetailsModal
          key={`${sessionKey}:${selectedTest.id}`}
          labTest={selectedTest}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTest(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRetake={handleRetake}
        />
      )}

      {/* Edit Test Result Modal */}
      {showEditModal && editingResult && (
        <EditTestResultModal
          key={`${sessionKey}:${editingResult.id}`}
          testResult={editingResult}
          onClose={() => {
            setShowEditModal(false);
            setEditingResult(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Submit Test Result Modal */}
      {showSubmitModal && testToSubmit && profile?.id && (
        <SubmitTestResultModal
          key={`${sessionKey}:${testToSubmit.id}`}
          labTest={testToSubmit}
          technicianId={profile.id}
          onClose={() => {
            setShowSubmitModal(false);
            setTestToSubmit(null);
          }}
          onSuccess={handleSubmitSuccess}
        />
      )}
    </div>
  );
}
