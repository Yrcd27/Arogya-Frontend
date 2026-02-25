import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { FlaskConicalIcon, DownloadIcon, EyeIcon, FileText, Calendar } from 'lucide-react';
import { medicalRecordsAPI, TestResult } from '../../services/medicalRecordsService';

export function LabResults() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);

  useEffect(() => {
    loadTestResults();
  }, []);

  const loadTestResults = async () => {
    setLoading(true);
    setError('');
    try {
      const patientId = 5;
      const data = await medicalRecordsAPI.getByPatientId(patientId);
      setTestResults(data);
    } catch (err) {
      setError('Failed to load test results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (result: TestResult) => {
    if (!result.fileName) {
      alert('No file attached to this result');
      return;
    }

    try {
      await medicalRecordsAPI.downloadFile(result.id);
    } catch (err) {
      alert('Failed to download file');
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">
              Dashboard / Lab Results
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Laboratory Results
            </h1>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-gray-600">Loading test results...</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Test ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Result</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No test results available
                        </td>
                      </tr>
                    ) : (
                      testResults.map(result => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {formatDate(result.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                                <FlaskConicalIcon className="w-5 h-5 text-[#38A3A5]" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">Test #{result.labTestId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900 line-clamp-2">{result.testResultDescription}</p>
                          </td>
                          <td className="px-6 py-4">
                            {result.fileName ? (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#38A3A5]" />
                                <div className="text-sm">
                                  <p className="text-gray-900 font-medium">{result.fileName}</p>
                                  <p className="text-gray-500 text-xs">{formatFileSize(result.fileSize)}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No file</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setSelectedResult(result)}
                                className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              {result.fileName && (
                                <button 
                                  onClick={() => handleDownload(result)}
                                  className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors"
                                  title="Download File"
                                >
                                  <DownloadIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedResult(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Test Result Details</h3>
              <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Test ID</label>
                  <p className="text-gray-900">#{selectedResult.labTestId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">{formatDate(selectedResult.createdAt)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Test Result</label>
                <p className="text-gray-900 whitespace-pre-wrap bg-green-50 p-4 rounded-lg border border-green-200 mt-1">
                  {selectedResult.testResultDescription}
                </p>
              </div>

              {selectedResult.technicianNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Technician Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg border border-blue-200 mt-1">
                    {selectedResult.technicianNotes}
                  </p>
                </div>
              )}

              {selectedResult.fileName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Attached File</label>
                  <div className="mt-2 flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-[#38A3A5]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedResult.fileName}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedResult.fileSize)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(selectedResult)}
                      className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors text-sm font-medium"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setSelectedResult(null)}
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
