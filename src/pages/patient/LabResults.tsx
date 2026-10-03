import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { EmptyState } from '../../components/EmptyState';
import { PaginationFooter } from '../../components/PaginationFooter';
import { FlaskConicalIcon, DownloadIcon, EyeIcon, FileText, Calendar } from 'lucide-react';
import { medicalRecordsAPI, TestResult, TestResultFile } from '../../services/medicalRecordsService';
import { labTestAPI } from '../../services/labTestService';
import { useAuth } from '../../hooks/useAuth';
import { FilePreviewModal } from '../../components/FilePreviewModal';

const PAGE_SIZE = 10;

export function LabResults() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [previewFile, setPreviewFile] = useState<TestResultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [previewOwnerId, setPreviewOwnerId] = useState<number | null>(null);
  const [testNameByLabTestId, setTestNameByLabTestId] = useState<Record<number, string>>({});
  const loadTestResultsRef = useRef<(patientId: number, pageNumber: number) => Promise<void>>(async () => undefined);
  const latestRequest = useRef(0);

  useEffect(() => {
    if (user?.id) void loadTestResultsRef.current(user.id, page);
  }, [user?.id, page]);

  const loadTestResults = async (patientId: number, pageNumber: number) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError('');
    try {
      const { items, total } = await medicalRecordsAPI.getByPatientIdPaged(patientId, { page: pageNumber, size: PAGE_SIZE });
      if (requestId !== latestRequest.current) return;
      setTestResults(items);
      setTotalResults(total);
      await hydrateTestNames(items);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError('Failed to load test results');
      console.error(err);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  loadTestResultsRef.current = loadTestResults;

  const hydrateTestNames = async (results: TestResult[]) => {
    const missingIds = Array.from(new Set(results.map(r => r.labTestId))).filter(id => !testNameByLabTestId[id]);
    if (missingIds.length === 0) return;

    const resolved = await Promise.all(
      missingIds.map(async (labTestId) => {
        try {
          const test = await labTestAPI.get(labTestId);
          return { labTestId, name: test.testName || `Test #${labTestId}` };
        } catch {
          return { labTestId, name: `Test #${labTestId}` };
        }
      })
    );

    const next: Record<number, string> = {};
    resolved.forEach(r => { next[r.labTestId] = r.name; });
    setTestNameByLabTestId(prev => ({ ...prev, ...next }));
  };

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const handleDownload = async (testResultId: number, fileId: number, fileName: string) => {
    try {
      await medicalRecordsAPI.downloadFile(testResultId, fileId, fileName);
    } catch (err) {
      alert('Failed to download file');
      console.error(err);
    }
  };

  const handlePreview = async (testResultId: number, file: TestResultFile) => {
    if (previewLoadingId !== null) return;
    setPreviewLoadingId(file.id);
    try {
      const { url } = await medicalRecordsAPI.getFilePreviewUrl(testResultId, file.id, file.fileName);
      setPreviewUrl(url);
      setPreviewFile(file);
      setPreviewOwnerId(testResultId);
    } catch (err) {
      console.error('Failed to load file preview:', err);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewOwnerId(null);
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
            <div className="mb-4 flex items-center justify-between gap-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => user?.id && void loadTestResults(user.id, page)}
                className="shrink-0 rounded px-3 py-1.5 font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-gray-600">Loading test results...</div>
            </div>
          ) : error ? null : testResults.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm">
              <EmptyState 
                title="No lab results yet"
                description="Your lab test results will appear here once ready"
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Test Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Result</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testResults.map(result => (
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
                              {testNameByLabTestId[result.labTestId] ? (
                                <span className="text-sm font-medium text-gray-900">{testNameByLabTestId[result.labTestId]}</span>
                              ) : (
                                <span className="inline-block bg-gray-200 animate-pulse rounded h-4 w-24" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900 line-clamp-2">{result.testResultDescription}</p>
                          </td>
                          <td className="px-6 py-4">
                            {result.files.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#38A3A5]" />
                                <div className="text-sm">
                                  <p className="text-gray-900 font-medium">
                                    {result.files.length === 1 ? result.files[0].fileName : `${result.files.length} files`}
                                  </p>
                                  {result.files.length === 1 && (
                                    <p className="text-gray-500 text-xs">{formatFileSize(result.files[0].fileSize)}</p>
                                  )}
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
                              {result.files.length === 1 && (
                                <button
                                  onClick={() => handleDownload(result.id, result.files[0].id, result.files[0].fileName)}
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
                    }
                  </tbody>
                </table>
              </div>

              <PaginationFooter
                currentPage={page + 1}
                totalPages={totalPages}
                pageSize={PAGE_SIZE}
                totalItems={totalResults}
                onPageChange={(newPage) => setPage(newPage - 1)}
              />
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
                  <label className="text-sm font-medium text-gray-500">Test Name</label>
                  <p className="text-gray-900">{testNameByLabTestId[selectedResult.labTestId] || 'Loading...'}</p>
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

              {selectedResult.files.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Attached Files ({selectedResult.files.length})</label>
                  <div className="mt-2 space-y-2">
                    {selectedResult.files.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-8 h-8 text-[#38A3A5] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handlePreview(selectedResult.id, file)}
                            disabled={previewLoadingId === file.id}
                            className="px-3 py-2 text-[#38A3A5] hover:bg-[#38A3A5]/10 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {previewLoadingId === file.id ? 'Loading...' : 'Preview'}
                          </button>
                          <button
                            onClick={() => handleDownload(selectedResult.id, file.id, file.fileName)}
                            className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors text-sm font-medium"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
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

      {previewFile && previewUrl && previewOwnerId !== null && (
        <FilePreviewModal
          fileName={previewFile.fileName}
          fileType={previewFile.fileType}
          url={previewUrl}
          onClose={closePreview}
          onDownload={() => handleDownload(previewOwnerId, previewFile.id, previewFile.fileName)}
        />
      )}
    </div>
  );
}
