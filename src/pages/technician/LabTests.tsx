import { useEffect, useState } from 'react';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { SubmitTestResultModal } from '../../components/technician/SubmitTestResultModal';
import { TestResultDetailsModal } from '../../components/technician/TestResultDetailsModal';
import { EditTestResultModal } from '../../components/technician/EditTestResultModal';
import { labTestAPI } from '../../services/labTestService';
import { medicalRecordsAPI } from '../../services/medicalRecordsService';
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

  useEffect(() => {
    loadLabTests();
  }, []);

  useEffect(() => {
    filterTests();
  }, [searchTerm, statusFilter, labTests]);

  const loadLabTests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await labTestAPI.list();
      setLabTests(data);
    } catch (err) {
      setError('Failed to load lab tests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = labTests;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(test => test.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(test =>
        test.testName.toLowerCase().includes(term) ||
        test.id.toString().includes(term) ||
        test.consultationId.toString().includes(term)
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by test name, ID, or consultation ID..."
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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Created At</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No lab tests found
                        </td>
                      </tr>
                    ) : (
                      filteredTests.map((test) => (
                        <tr key={test.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{test.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(test.status)}
                              <span className="text-sm font-medium text-gray-900">{test.testName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700"># {test.consultationId}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                              {test.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{formatDateTime(test.createdAt)}</span>
                          </td>
                          <td className="px-6 py-4">
                            {test.status === 'IN_PROGRESS' || test.status === 'PENDING' ? (
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
                      ))
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
