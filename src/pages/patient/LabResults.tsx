import { PageContent } from '../../components/PageContent';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { EmptyState } from '../../components/EmptyState';
import { PaginationFooter } from '../../components/PaginationFooter';
import { FlaskConicalIcon, DownloadIcon, FileText, Calendar } from 'lucide-react';
import { medicalRecordsAPI, TestResult, TestResultFile } from '../../services/medicalRecordsService';
import { labTestAPI } from '../../services/labTestService';
import { useAuth } from '../../hooks/useAuth';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { DETAIL_LABEL, DETAIL_VALUE, BUTTON_OUTLINE, BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_ALERT, MODAL_CLOSE, MODAL_FOOTER, MODAL_HEADER, MODAL_OVERLAY, MODAL_PANEL_SCROLL, MODAL_TEXT_BLOCK, MODAL_TITLE } from '../../components/dialogs/modalStyles';
import { ViewAction } from '../../components/ViewAction';

const PAGE_SIZE = 10;

export function LabResults() {
  const { user, sessionKey } = useAuth();
  const currentSessionRef = useRef(sessionKey);
  currentSessionRef.current = sessionKey;
  const previewRequestRef = useRef(0);
  const previewPendingRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const selectedResultRef = useRef<number | null>(null);
  const downloadPendingRef = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [previewFile, setPreviewFile] = useState<TestResultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [previewOwnerId, setPreviewOwnerId] = useState<number | null>(null);
  const [testNameByLabTestId, setTestNameByLabTestId] = useState<Record<number, string>>({});
  const loadTestResultsRef = useRef<(patientId: number, pageNumber: number) => Promise<void>>(async () => undefined);
  const latestRequest = useRef(0);
  const [fileError, setFileError] = useState('');
  const [downloadLoadingId, setDownloadLoadingId] = useState<number | null>(null);

  useEffect(() => {
    currentSessionRef.current = sessionKey;
    setSelectedResult(null);
    selectedResultRef.current = null;
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewOwnerId(null);
    setPreviewLoadingId(null);
    previewPendingRef.current = false;
    setFileError('');
    setTestResults([]);
    setTestNameByLabTestId({});
    setPage(0);
    return () => {
      currentSessionRef.current = -1;
      latestRequest.current += 1;
      previewRequestRef.current += 1;
      if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    };
  }, [sessionKey]);

  useEffect(() => {
    if (user?.id) void loadTestResultsRef.current(user.id, page);
  }, [user?.id, page, sessionKey]);

  const loadTestResults = async (patientId: number, pageNumber: number) => {
    const requestId = ++latestRequest.current;
    const requestSession = sessionKey;
    setLoading(true);
    setError('');
    try {
      const { items, total } = await medicalRecordsAPI.getByPatientIdPaged(patientId, { page: pageNumber, size: PAGE_SIZE });
      if (requestId !== latestRequest.current || currentSessionRef.current !== requestSession) return;
      setTestResults(items);
      setTotalResults(total);
      await hydrateTestNames(items, () => requestId === latestRequest.current && currentSessionRef.current === requestSession);
    } catch (err) {
      if (requestId !== latestRequest.current || currentSessionRef.current !== requestSession) return;
      setError('Failed to load test results');
      console.error(err);
    } finally {
      if (requestId === latestRequest.current && currentSessionRef.current === requestSession) setLoading(false);
    }
  };

  loadTestResultsRef.current = loadTestResults;

  const hydrateTestNames = async (results: TestResult[], isCurrent: () => boolean) => {
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
    if (isCurrent()) setTestNameByLabTestId(prev => ({ ...prev, ...next }));
  };

  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const handleDownload = async (testResultId: number, fileId: number, fileName: string) => {
    if (downloadPendingRef.current) return;
    const requestSession = sessionKey;
    const selectedOwner = selectedResultRef.current;
    downloadPendingRef.current = true;
    setDownloadLoadingId(fileId);
    setFileError('');
    try {
      await medicalRecordsAPI.downloadFile(testResultId, fileId, fileName);
    } catch (err) {
      if (currentSessionRef.current === requestSession && selectedResultRef.current === selectedOwner) setFileError(err instanceof Error ? err.message : 'Failed to download this file. Try Download again.');
    } finally {
      downloadPendingRef.current = false;
      if (currentSessionRef.current === requestSession) setDownloadLoadingId(null);
    }
  };

  const handlePreview = async (testResultId: number, file: TestResultFile) => {
    if (previewPendingRef.current || selectedResultRef.current !== testResultId) return;
    const requestId = ++previewRequestRef.current;
    const requestSession = sessionKey;
    const isCurrent = () => requestId === previewRequestRef.current && selectedResultRef.current === testResultId && currentSessionRef.current === requestSession;
    previewPendingRef.current = true;
    setPreviewLoadingId(file.id);
    setFileError('');
    try {
      const { url } = await medicalRecordsAPI.getFilePreviewUrl(testResultId, file.id, file.fileName);
      if (!isCurrent()) { window.URL.revokeObjectURL(url); return; }
      if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setPreviewFile(file);
      setPreviewOwnerId(testResultId);
    } catch (err) {
      if (isCurrent()) setFileError(err instanceof Error ? err.message : 'Failed to preview this file. Try Preview again.');
    } finally {
      if (isCurrent()) { previewPendingRef.current = false; setPreviewLoadingId(null); }
    }
  };

  const closePreview = () => {
    previewRequestRef.current += 1;
    previewPendingRef.current = false;
    setPreviewLoadingId(null);
    if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewOwnerId(null);
  };

  const openResult = (result: TestResult) => {
    closePreview();
    selectedResultRef.current = result.id;
    setSelectedResult(result);
    setFileError('');
  };

  const closeResult = () => {
    closePreview();
    selectedResultRef.current = null;
    setSelectedResult(null);
    setFileError('');
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
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent fill={!loading && !error && testResults.length === 0}>
          <div>
            <p className="text-gray-600 text-sm mb-1">
              Dashboard / Lab Results
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Laboratory Results
            </h1>
          </div>

          {fileError && !selectedResult && <p role="alert" className={MODAL_ALERT}>{fileError}</p>}
          {error && (
            <div className="flex items-center justify-between gap-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
            <EmptyState variant="page" icon={<FlaskConicalIcon />} title="No lab results yet"
              description="Your lab test results will appear here once they are ready." />
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Test Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Result</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">File</th>
                      <th className="w-px whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testResults.map(result => (
                        <tr key={result.id} className="align-middle hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
                              {formatDate(result.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#38A3A5]/10">
                                <FlaskConicalIcon aria-hidden="true" className="h-[18px] w-[18px] text-[#38A3A5]" />
                              </div>
                              {testNameByLabTestId[result.labTestId] ? (
                                <span className="text-sm font-medium text-gray-900">{testNameByLabTestId[result.labTestId]}</span>
                              ) : (
                                <span className="inline-block bg-gray-200 animate-pulse rounded h-4 w-24" />
                              )}
                            </div>
                          </td>
                          <td className="max-w-md px-4 py-3">
                            <p className="line-clamp-2 break-words text-sm leading-5 text-gray-900" title={result.testResultDescription}>{result.testResultDescription}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {result.files.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-[#38A3A5]" />
                                <div className="min-w-0 text-sm">
                                  <p className="max-w-[12rem] truncate font-medium text-gray-900" title={result.files.length === 1 ? result.files[0].fileName : undefined}>
                                    {result.files.length === 1 ? result.files[0].fileName : `${result.files.length} files`}
                                  </p>
                                  {result.files.length === 1 && (
                                    <p className="text-gray-500 text-xs">{formatFileSize(result.files[0].fileSize)}</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="whitespace-nowrap text-sm text-gray-400">No file</span>
                            )}
                          </td>
                          <td className="w-px whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <ViewAction label="View details" onClick={() => openResult(result)} />
                              {result.files.length === 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDownload(result.id, result.files[0].id, result.files[0].fileName)}
                                  disabled={downloadLoadingId !== null}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-[#38A3A5]/10 hover:text-[#2d8284] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] disabled:cursor-not-allowed disabled:opacity-40"
                                  title="Download file"
                                  aria-label="Download file"
                                >
                                  <DownloadIcon aria-hidden="true" className="h-[18px] w-[18px]" />
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
        </PageContent>
      </div>

      {selectedResult && (
        <div className={`${MODAL_OVERLAY} z-50`} onClick={closeResult}>
          <div className={`${MODAL_PANEL_SCROLL} max-w-3xl p-5 sm:p-6`} onClick={(e) => e.stopPropagation()}>
            <div className={MODAL_HEADER}>
              <h3 className={MODAL_TITLE}>Test Result Details</h3>
              <button type="button" aria-label="Close test result" onClick={closeResult} className={MODAL_CLOSE}>
                <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {fileError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{fileError}</p>}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <p className={DETAIL_LABEL}>Test Name</p>
                  <p className={DETAIL_VALUE}>{testNameByLabTestId[selectedResult.labTestId] || 'Loading...'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Date</p>
                  <p className={DETAIL_VALUE}>{formatDate(selectedResult.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className={DETAIL_LABEL}>Test Result</p>
                <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                  {selectedResult.testResultDescription}
                </p>
              </div>

              {selectedResult.technicianNotes && (
                <div>
                  <p className={DETAIL_LABEL}>Technician Notes</p>
                  <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                    {selectedResult.technicianNotes}
                  </p>
                </div>
              )}

              {selectedResult.files.length > 0 && (
                <div>
                  <p className={DETAIL_LABEL}>Attached Files ({selectedResult.files.length})</p>
                  <div className="mt-2 space-y-2">
                    {selectedResult.files.map(file => (
                      <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText aria-hidden="true" className="h-6 w-6 shrink-0 text-[#38A3A5]" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                            <p className="text-xs text-gray-600">{formatFileSize(file.fileSize)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handlePreview(selectedResult.id, file)}
                            disabled={previewLoadingId !== null}
                            className={`${BUTTON_OUTLINE} h-9 px-3`}
                          >
                            {previewLoadingId === file.id ? 'Loading...' : 'Preview'}
                          </button>
                          <button
                            onClick={() => handleDownload(selectedResult.id, file.id, file.fileName)}
                            disabled={downloadLoadingId !== null}
                            className={`${BUTTON_PRIMARY} h-9 px-3`}
                          >
                            {downloadLoadingId === file.id ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={MODAL_FOOTER}>
              <button
                type="button"
                className={BUTTON_SECONDARY}
                onClick={closeResult}
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
