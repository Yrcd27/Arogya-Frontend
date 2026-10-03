import { useEffect, useMemo, useRef, useState } from 'react';
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
import { FlaskConical, Search, Clock, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ApiError } from '../../services/httpClient';

export function LabTests() {
  const { profile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [testToSubmit, setTestToSubmit] = useState<LabTest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResult, setEditingResult] = useState<TestResult | null>(null);
  const [patientByConsultation, setPatientByConsultation] = useState<Record<number, { patientId: number; name: string }>>({});
  const [resultExistsByLabTest, setResultExistsByLabTest] = useState<Record<number, boolean>>({});
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const loadLabTestsRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    void loadLabTestsRef.current();
  }, []);

  const loadLabTests = async () => {
    setLoading(true);
    setError('');
    try {
      const pageSize = 200;
      let page = 0;
      let data: LabTest[] = [];
      for (;;) {
        const { items, total } = await labTestAPI.list({ page, size: pageSize });
        data = data.concat(items);
        if (items.length === 0 || data.length >= total) break;
        page += 1;
      }
      setLabTests(data);
      await Promise.all([
        hydratePatientDetails(data),
        hydrateResultPresence(data),
      ]);
    } catch (err) {
      setError('Failed to load lab tests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  loadLabTestsRef.current = loadLabTests;

  const hydratePatientDetails = async (tests: LabTest[]) => {
    const consultationIds = Array.from(new Set(tests.map(t => t.consultationId)));
    const missing = consultationIds.filter(id => !patientByConsultation[id]);
    if (missing.length === 0) return;

    const results = await Promise.all(
      missing.map(async (consultationId) => {
        try {
          const consultation = await consultationAPI.get(consultationId);
          const patientId = consultation.patientId;

          try {
            const profile = await profileAPI.getPatient(patientId);
            const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
            if (name) return { consultationId, patientId, name };
          } catch {
            // Fallback to user service below.
          }

          try {
            const user = await userAPI.getUser(patientId);
            const name = user?.username || `Patient #${patientId}`;
            return { consultationId, patientId, name };
          } catch {
            return { consultationId, patientId, name: `Patient #${patientId}` };
          }
        } catch {
          return { consultationId, patientId: 0, name: '-' };
        }
      })
    );

    const next: Record<number, { patientId: number; name: string }> = {};
    results.forEach((r) => {
      next[r.consultationId] = { patientId: r.patientId, name: r.name };
    });
    setPatientByConsultation(prev => ({ ...prev, ...next }));
  };

  const hydrateResultPresence = async (tests: LabTest[]) => {
    const candidateIds = tests
      .filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
      .map(t => t.id);
    if (candidateIds.length === 0) return;

    const checks = await Promise.all(
      candidateIds.map(async (labTestId) => {
        try {
          const result = await medicalRecordsAPI.getByLabTestId(labTestId);
          return { labTestId, exists: !!result?.id };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return { labTestId, exists: false };
          throw err;
        }
      })
    );

    const next: Record<number, boolean> = {};
    checks.forEach(({ labTestId, exists }) => {
      next[labTestId] = exists;
    });
    setResultExistsByLabTest(prev => ({ ...prev, ...next }));
  };

  const filteredTests = useMemo(() => {
    let filtered = labTests;

    if (assignedToMeOnly && profile?.id) {
      filtered = filtered.filter(test => test.assignedTechnicianId === profile.id);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(test => test.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(test =>
        test.testName.toLowerCase().includes(term) ||
        test.id.toString().includes(term) ||
        test.consultationId.toString().includes(term) ||
        (patientByConsultation[test.consultationId]?.name || '').toLowerCase().includes(term) ||
        (patientByConsultation[test.consultationId]?.patientId?.toString() || '').includes(term)
      );
    }

    return filtered;
  }, [assignedToMeOnly, labTests, patientByConsultation, profile?.id, searchTerm, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'IN_PROGRESS':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FlaskConical className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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
    if (test.status === 'IN_PROGRESS') {
      setTestToSubmit(test);
      setShowSubmitModal(true);
      return;
    }
    if (!profile?.id) {
      setError('Your technician profile has not loaded yet — please try again in a moment.');
      return;
    }
    if (actionLoadingId !== null) return;
    setActionLoadingId(test.id);
    let assigned = false;
    try {
      await labTestAPI.assign(test.id, profile.id);
      assigned = true;
      const started = await labTestAPI.start(test.id);
      setLabTests(prev => prev.map(t => (t.id === test.id ? started : t)));
      setTestToSubmit(started);
      setShowSubmitModal(true);
    } catch (err) {
      setError(assigned ? 'The test was assigned, but could not be started. Refresh and continue from its current server status.' : err instanceof Error ? err.message : 'Failed to start test');
      await loadLabTests();
    } finally {
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
    try {
      await medicalRecordsAPI.delete(resultId);
      setShowDetailsModal(false);
      setSelectedTest(null);
      await loadLabTests();
    } catch (err) {
      setError('Failed to delete test result');
    }
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
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-1">Dashboard / Lab Tests</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Lab Tests</h1>
          </div>

          {/* Status Filter Tabs */}
          <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === status
                    ? 'bg-[#38A3A5] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {status.replace('_', ' ')} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by test name, patient, ID, or consultation ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                />
              </div>
              <label className="flex items-center gap-2 px-3 text-sm text-gray-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={assignedToMeOnly}
                  onChange={(e) => setAssignedToMeOnly(e.target.checked)}
                  className="w-4 h-4 text-[#38A3A5] border-gray-300 rounded focus:ring-[#38A3A5]"
                />
                Assigned to me
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-gray-600">Loading lab tests...</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Test Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Consultation</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Patient</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created At</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No lab tests found
                        </td>
                      </tr>
                    ) : (
                      filteredTests.map((test) => {
                        const displayStatus = test.status;
                        return (
                        <tr key={test.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{test.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(displayStatus)}
                              <span className="text-sm font-medium text-gray-900">{test.testName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700"># {test.consultationId}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">
                              {patientByConsultation[test.consultationId]?.name || 'Loading...'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                              {displayStatus}
                            </span>
                            {resultExistsByLabTest[test.id] && displayStatus !== 'COMPLETED' && (
                              <span className="ml-2 text-xs text-amber-700">Result recorded</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{formatDateTime(test.createdAt)}</span>
                          </td>
                          <td className="px-6 py-4">
                            {displayStatus === 'IN_PROGRESS' || displayStatus === 'PENDING' ? (
                              <button
                                onClick={() => handleTakeTest(test)}
                                disabled={actionLoadingId !== null || !!(showSubmitModal && testToSubmit && testToSubmit.id === test.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${actionLoadingId !== null || showSubmitModal && testToSubmit && testToSubmit.id === test.id ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-[#38A3A5] text-white hover:bg-[#2d8284]'}`}
                              >
                                <Play className="w-4 h-4" />
                                Take Test
                              </button>
                            ) : (
                              <button
                                onClick={() => handleViewDetails(test)}
                                className="text-[#38A3A5] hover:text-[#2d8284] font-medium text-sm"
                              >
                                View Result
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Test Result Details Modal */}
      {showDetailsModal && selectedTest && (
        <TestResultDetailsModal
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
