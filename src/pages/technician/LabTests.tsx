import { useEffect, useState } from 'react';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { labTestAPI } from '../../services/labTestService';
import { LabTest } from '../../types/labTest';
import { FlaskConical, Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function LabTests() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);

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

  const statusCounts = {
    ALL: labTests.length,
    PENDING: labTests.filter(t => t.status === 'PENDING').length,
    IN_PROGRESS: labTests.filter(t => t.status === 'IN_PROGRESS').length,
    COMPLETED: labTests.filter(t => t.status === 'COMPLETED').length,
    CANCELLED: labTests.filter(t => t.status === 'CANCELLED').length,
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
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
                            <button
                              onClick={() => setSelectedTest(test)}
                              className="text-[#38A3A5] hover:text-[#2d8284] font-medium text-sm"
                            >
                              View Details
                            </button>
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

      {/* Detail Modal */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedTest(null)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Lab Test Details</h3>
              <button onClick={() => setSelectedTest(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Test ID</label>
                  <p className="text-gray-900 flex items-center gap-2">
                    {getStatusIcon(selectedTest.status)}
                    {selectedTest.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Consultation ID</label>
                  <p className="text-gray-900">{selectedTest.consultationId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTest.status)}`}>
                      {selectedTest.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900">{formatDateTime(selectedTest.createdAt)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Test Name</label>
                <p className="text-gray-900 font-semibold">{selectedTest.testName}</p>
              </div>

              {selectedTest.testDescription && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedTest.testDescription}</p>
                </div>
              )}

              {selectedTest.testInstructions && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Instructions for Technician</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {selectedTest.testInstructions}
                  </p>
                </div>
              )}

              {selectedTest.testResults && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Test Results</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-green-50 p-3 rounded-lg border border-green-200">
                    {selectedTest.testResults}
                  </p>
                </div>
              )}

              {selectedTest.technicianNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Technician Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedTest.technicianNotes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTest.assignedTechnicianId && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned Technician ID</label>
                    <p className="text-gray-900">{selectedTest.assignedTechnicianId}</p>
                  </div>
                )}
                {selectedTest.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Completed At</label>
                    <p className="text-gray-900">{formatDateTime(selectedTest.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setSelectedTest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
