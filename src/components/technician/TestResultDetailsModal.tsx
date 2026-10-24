import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { LabTest } from '../../types/labTest';
import { ApiError } from '../../services/httpClient';
import { medicalRecordsAPI, type TestResult, type TestResultFile } from '../../services/medicalRecordsService';
import { labTestAPI } from '../../services/labTestService';
import { FilePreviewModal } from '../FilePreviewModal';
import { EmptyState } from '../EmptyState';
import { ConfirmModal } from '../ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { isPositiveId } from '../../utils/clinicalValidation';
import { StatusBadge } from '../StatusBadge';
import { DETAIL_LABEL, DETAIL_VALUE, MODAL_ALERT, MODAL_CLOSE, MODAL_HEADER, MODAL_INFO_PANEL, MODAL_OVERLAY, MODAL_PANEL_SCROLL, MODAL_TEXT_BLOCK, MODAL_TITLE, BUTTON_DANGER, BUTTON_OUTLINE, BUTTON_PRIMARY, BUTTON_SECONDARY } from '../dialogs/modalStyles';

interface TestResultDetailsModalProps {
  labTest: LabTest;
  onClose: () => void;
  onEdit: (result: TestResult) => void;
  onDelete: (resultId: number) => Promise<void>;
  onRetake: () => void;
}

export function TestResultDetailsModal({ labTest, onClose, onEdit, onDelete, onRetake }: TestResultDetailsModalProps) {
  const { sessionKey } = useAuth();
  const contextKey = `${sessionKey}:${labTest.id}`;
  const currentContextRef = useRef(contextKey);
  currentContextRef.current = contextKey;
  const resultRequestRef = useRef(0);
  const previewRequestRef = useRef(0);
  const previewPendingRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const mutationRef = useRef(false);
  const downloadPendingRef = useRef(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TestResultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [retaking, setRetaking] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloadLoadingId, setDownloadLoadingId] = useState<number | null>(null);

  useEffect(() => {
    currentContextRef.current = contextKey;
    return () => {
      currentContextRef.current = '';
      resultRequestRef.current += 1;
      previewRequestRef.current += 1;
      if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [contextKey]);

  const loadTestResult = useCallback(async () => {
    const requestId = ++resultRequestRef.current;
    const isCurrent = () => requestId === resultRequestRef.current && currentContextRef.current === contextKey;
    try {
      setLoading(true);
      setError(null);
      setTestResult(null);
      const result = await medicalRecordsAPI.getByLabTestId(labTest.id);
      if (!isCurrent()) return;
      if (!isPositiveId(result?.id) || result.labTestId !== labTest.id) throw new Error('The result response does not match this lab test. Retry loading it.');
      setTestResult(result);
    } catch (err) {
      if (!isCurrent()) return;
      setTestResult(null);
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : 'Failed to load test result');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [labTest.id, contextKey]);

  useEffect(() => {
    void loadTestResult();
  }, [loadTestResult]);

  const handleDownload = async (fileId: number, fileName: string) => {
    if (!testResult?.id || downloadPendingRef.current || !testResult.files.some(file => file.id === fileId)) return;
    const requestContext = contextKey;
    downloadPendingRef.current = true;
    setDownloadLoadingId(fileId);
    setFileError(null);
    try {
      await medicalRecordsAPI.downloadFile(testResult.id, fileId, fileName);
    } catch (err) {
      if (currentContextRef.current === requestContext) setFileError(err instanceof Error ? err.message : 'Failed to download this file. Try Download again.');
    } finally {
      downloadPendingRef.current = false;
      if (currentContextRef.current === requestContext) setDownloadLoadingId(null);
    }
  };

  const handlePreview = async (file: TestResultFile) => {
    if (!testResult?.id || previewPendingRef.current || !testResult.files.some(item => item.id === file.id)) return;
    const requestId = ++previewRequestRef.current;
    const isCurrent = () => requestId === previewRequestRef.current && currentContextRef.current === contextKey;
    previewPendingRef.current = true;
    setPreviewLoadingId(file.id);
    setFileError(null);
    try {
      const { url } = await medicalRecordsAPI.getFilePreviewUrl(testResult.id, file.id, file.fileName);
      if (!isCurrent()) { window.URL.revokeObjectURL(url); return; }
      if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      if (isCurrent()) setFileError(err instanceof Error ? err.message : 'Failed to preview this file. Try Preview again.');
    } finally {
      if (isCurrent()) { previewPendingRef.current = false; setPreviewLoadingId(null); }
    }
  };

  const handleRetake = async () => {
    if (mutationRef.current || loading || error || testResult || labTest.status !== 'COMPLETED' || !isPositiveId(labTest.id)) return;
    const requestContext = contextKey;
    mutationRef.current = true;
    setRetaking(true);
    setRetakeError(null);
    try {
      await labTestAPI.start(labTest.id);
      if (currentContextRef.current === requestContext) onRetake();
    } catch (err) {
      if (currentContextRef.current === requestContext) setRetakeError(err instanceof Error ? err.message : 'Failed to reopen this test');
    } finally {
      mutationRef.current = false;
      setRetaking(false);
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
  };

  const closeModal = () => {
    if (mutationRef.current) return;
    closePreview();
    resultRequestRef.current += 1;
    onClose();
  };

  const confirmDelete = async () => {
    if (!testResult || mutationRef.current) return;
    const requestContext = contextKey;
    mutationRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(testResult.id);
      if (currentContextRef.current !== requestContext) return;
      setConfirmingDelete(false);
    } catch (err) {
      if (currentContextRef.current === requestContext) setDeleteError(err instanceof Error ? err.message : 'Failed to delete test result. Please try again.');
    } finally {
      mutationRef.current = false;
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  return (
    <div className={`${MODAL_OVERLAY} z-50`} onClick={closeModal}>
      <div className={`${MODAL_PANEL_SCROLL} max-w-3xl p-5 sm:p-6`} onClick={(e) => e.stopPropagation()}>
        <div className={MODAL_HEADER}>
          <h3 className={MODAL_TITLE}>Test Result Details</h3>
          <button type="button" aria-label="Close test result details" onClick={closeModal} disabled={deleting || retaking} className={MODAL_CLOSE}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading...</div>
        ) : error ? (
          <div role="alert" className="text-center py-8 text-red-700">{error}<button type="button" onClick={() => void loadTestResult()} className="ml-3 underline">Retry</button></div>
        ) : testResult ? (
          <div className="space-y-4">
            {fileError && <p role="alert" className={MODAL_ALERT}>{fileError}</p>}
            <div className={MODAL_INFO_PANEL}>
              <p className="text-sm text-gray-900"><span className="font-semibold text-gray-600">Test:</span> {labTest.testName}</p>
              <p className="text-sm text-gray-900"><span className="font-semibold text-gray-600">Test ID:</span> {labTest.id}</p>
              <p className="flex items-center gap-2 text-sm text-gray-900"><span className="font-semibold text-gray-600">Status:</span> <StatusBadge status={labTest.status} /></p>
            </div>

            <div>
              <p className={DETAIL_LABEL}>Test Result Description</p>
              <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                {testResult.testResultDescription}
              </p>
            </div>

            {testResult.technicianNotes && (
              <div>
                <p className={DETAIL_LABEL}>Technician Notes</p>
                <p className={`${MODAL_TEXT_BLOCK} mt-2`}>
                  {testResult.technicianNotes}
                </p>
              </div>
            )}

            {testResult.files.length > 0 && (
              <div>
                <p className={DETAIL_LABEL}>Attached Files ({testResult.files.length})</p>
                <div className="mt-2 space-y-2">
                  {testResult.files.map(file => (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(file.fileSize)}</p>
                      </div>
                      <button
                        onClick={() => handlePreview(file)}
                        disabled={previewLoadingId !== null}
                        className={`${BUTTON_OUTLINE} h-9 shrink-0 px-3`}
                      >
                        <Eye className="w-4 h-4" />
                        {previewLoadingId === file.id ? 'Loading...' : 'Preview'}
                      </button>
                      <button
                        disabled={downloadLoadingId !== null}
                        onClick={() => handleDownload(file.id, file.fileName)}
                        className={`${BUTTON_PRIMARY} h-9 shrink-0 px-3`}
                      >
                        <Download className="w-4 h-4" />
                        {downloadLoadingId === file.id ? 'Downloading...' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <p className={DETAIL_LABEL}>Created At</p>
                <p className={DETAIL_VALUE}>{new Date(testResult.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className={DETAIL_LABEL}>Updated At</p>
                <p className={DETAIL_VALUE}>{new Date(testResult.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => { if (!mutationRef.current) onEdit(testResult); }}
                disabled={deleting || retaking}
                className={BUTTON_PRIMARY}
              >
                <Edit className="w-4 h-4" />
                Edit Result
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting || retaking}
                className={BUTTON_DANGER}
              >
                <Trash2 className="w-4 h-4" />
                Delete Result
              </button>
              <button
                onClick={closeModal}
                disabled={deleting || retaking}
                className={`${BUTTON_SECONDARY} ml-auto`}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <EmptyState icon={<FileText />} title="No test result available" description="No test result was found for this lab test." headingLevel={4} />
            {labTest.status === 'COMPLETED' && (
              <>
                <p className="text-sm text-gray-500 mb-4">This test is marked completed but its result is missing — you can reopen it to submit a new result.</p>
                {retakeError && (
                  <div className={`mb-4 inline-block ${MODAL_ALERT}`}>
                    {retakeError}
                  </div>
                )}
                <div>
                  <button
                    onClick={handleRetake}
                    disabled={retaking}
                    className={BUTTON_PRIMARY}
                  >
                    {retaking ? 'Reopening...' : 'Retake Test'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {previewFile && previewUrl && (
        <FilePreviewModal
          fileName={previewFile.fileName}
          fileType={previewFile.fileType}
          url={previewUrl}
          onClose={closePreview}
          onDownload={() => testResult && handleDownload(previewFile.id, previewFile.fileName)}
        />
      )}

      <ConfirmModal
        isOpen={confirmingDelete}
        title="Delete test result?"
        confirmLabel="Delete"
        loading={deleting}
        message={deleteError || "This will permanently delete the test result and any attached files. This cannot be undone."}
        onCancel={() => {
          if (!mutationRef.current) {
            setConfirmingDelete(false);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
