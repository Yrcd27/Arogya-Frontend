import { useEffect, useState } from 'react';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { SubmitTestResultModal } from '../../components/technician/SubmitTestResultModal';
import { TestResultDetailsModal } from '../../components/technician/TestResultDetailsModal';
import { EditTestResultModal } from '../../components/technician/EditTestResultModal';
import { labTestAPI } from '../../services/labTestService';
import { medicalRecordsAPI } from '../../services/medicalRecordsService';
import { consultationAPI } from '../../services/consultationService';
import { profileAPI, userAPI } from '../../services/userService';
import { LabTest } from '../../types/labTest';
import { FlaskConical, Search, Clock, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';

export function LabTests() {
  const { profile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [testToSubmit, setTestToSubmit] = useState<LabTest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [patientByConsultation, setPatientByConsultation] = useState<Record<number, { patientId: number; name: string }>>({});
  const [resultExistsByLabTest, setResultExistsByLabTest] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadLabTests();
  }, []);

  useEffect(() => {
    filterTests();
  }, [searchTerm, statusFilter, labTests, patientByConsultation, resultExistsByLabTest]);

  const loadLabTests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await labTestAPI.list();
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
        } catch (err: any) {
          const msg = err?.message || '';
          if (msg.includes('(404)') || msg.toLowerCase().includes('not found')) {
            return { labTestId, exists: false };
          }
          return { labTestId, exists: false };
        }
      })
    );

    const next: Record<number, boolean> = {};
    checks.forEach(({ labTestId, exists }) => {
      next[labTestId] = exists;
    });
    setResultExistsByLabTest(prev => ({ ...prev, ...next }));
  };

  const getDisplayStatus = (test: LabTest) => {
    if ((test.status === 'PENDING' || test.status === 'IN_PROGRESS') && resultExistsByLabTest[test.id]) {
      return 'COMPLETED';
    }
    return test.status;
  };

  const filterTests = () => {
    let filtered = labTests;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(test => getDisplayStatus(test) === statusFilter);
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

    setFilteredTests(filtered);
  };

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

  const handleTakeTest = (test: LabTest) => {
    // Open the submit modal but do NOT update the backend status yet.
    // The test should remain visible as PENDING until a result is submitted.
    setTestToSubmit(test);
    setShowSubmitModal(true);
  };

  const handleSubmitSuccess = async () => {
    // Save reference before clearing modal state
    const submittedTest = testToSubmit;

    // Close the modal first so UI updates immediately
    setShowSubmitModal(false);
    setTestToSubmit(null);
    if (submittedTest) {
      // Optimistic UI: result was created/exists, so treat as completed in this screen.
      setResultExistsByLabTest(prev => ({ ...prev, [submittedTest.id]: true }));
    }

    // After a test result is submitted, mark the lab test as COMPLETED
    try {
      if (submittedTest) {
        try {
          await labTestAPI.updateStatus(submittedTest.id, {
            status: 'COMPLETED',
            assignedTechnicianId: profile?.id,
          });
        } catch {
          // Fallback for backends that don't expose /technician-update.
          await labTestAPI.update(submittedTest.id, {
            status: 'COMPLETED',
            assignedTechnicianId: profile?.id,
          });
        }
      }
    } catch (err: any) {
      // If backend returns 409 (conflict) the status may already be set server-side.
      const msg = err?.message || '';
      if (msg.includes('(409)') || msg.includes('409')) {
        console.warn('Lab test status update returned 409 (conflict), retrying with step transition', msg);
        try {
          if (submittedTest) {
            const latest = await labTestAPI.get(submittedTest.id);
            if (latest.status === 'PENDING') {
              try {
                await labTestAPI.updateStatus(submittedTest.id, {
                  status: 'IN_PROGRESS',
                  assignedTechnicianId: profile?.id,
                });
              } catch {
                await labTestAPI.update(submittedTest.id, {
                  status: 'IN_PROGRESS',
                  assignedTechnicianId: profile?.id,
                });
              }
            }
            try {
              await labTestAPI.updateStatus(submittedTest.id, {
                status: 'COMPLETED',
                assignedTechnicianId: profile?.id,
              });
            } catch {
              await labTestAPI.update(submittedTest.id, {
                status: 'COMPLETED',
                assignedTechnicianId: profile?.id,
              });
            }
          }
        } catch (retryErr) {
          setError('Result submitted, but status transition failed due to backend conflict');
          console.error(retryErr);
        }
      } else {
        setError('Failed to update test status to COMPLETED');
        console.error(err);
      }
    }

    // Reload the list to reflect the new status
    loadLabTests();
  };

  const handleViewDetails = (test: LabTest) => {
    setSelectedTest(test);
    setShowDetailsModal(true);
  };

  const handleEdit = (result: any) => {
    setEditingResult(result);
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  const handleDelete = async (resultId: number) => {
    try {
      await medicalRecordsAPI.delete(resultId);
      setShowDetailsModal(false);
      setSelectedTest(null);
      // Wait a bit for backend to update lab test status
      setTimeout(() => {
        loadLabTests();
      }, 500);
    } catch (err) {
      setError('Failed to delete test result');
    }
  };

  const handleEditSuccess = () => {
    loadLabTests();
    setShowEditModal(false);
    setEditingResult(null);
  };

  const statusCounts = {
    ALL: labTests.length,
    PENDING: labTests.filter(t => getDisplayStatus(t) === 'PENDING').length,
    IN_PROGRESS: labTests.filter(t => getDisplayStatus(t) === 'IN_PROGRESS').length,
    COMPLETED: labTests.filter(t => getDisplayStatus(t) === 'COMPLETED').length,
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by test name, patient, ID, or consultation ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              />
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
                        const displayStatus = getDisplayStatus(test);
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
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{formatDateTime(test.createdAt)}</span>
                          </td>
                          <td className="px-6 py-4">
                            {displayStatus === 'IN_PROGRESS' || displayStatus === 'PENDING' ? (
                              <button
                                onClick={() => handleTakeTest(test)}
                                disabled={!!(showSubmitModal && testToSubmit && testToSubmit.id === test.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${showSubmitModal && testToSubmit && testToSubmit.id === test.id ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-[#38A3A5] text-white hover:bg-[#2d8284]'}`}
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
