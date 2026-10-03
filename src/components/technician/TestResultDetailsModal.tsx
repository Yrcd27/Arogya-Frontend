import { useState, useEffect, useCallback } from 'react';
import { X, Download, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { LabTest } from '../../types/labTest';
import { ApiError } from '../../services/httpClient';
import { medicalRecordsAPI, type TestResult, type TestResultFile } from '../../services/medicalRecordsService';
import { labTestAPI } from '../../services/labTestService';
import { FilePreviewModal } from '../FilePreviewModal';
import { ConfirmModal } from '../ConfirmModal';

interface TestResultDetailsModalProps {
  labTest: LabTest;
  onClose: () => void;
  onEdit: (result: TestResult) => void;
  onDelete: (resultId: number) => Promise<void>;
  onRetake: () => void;
}

export function TestResultDetailsModal({ labTest, onClose, onEdit, onDelete, onRetake }: TestResultDetailsModalProps) {
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

  const loadTestResult = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await medicalRecordsAPI.getByLabTestId(labTest.id);
      setTestResult(result);
    } catch (err) {
      setTestResult(null);
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : 'Failed to load test result');
      }
    } finally {
      setLoading(false);
    }
  }, [labTest.id]);

  useEffect(() => {
    void loadTestResult();
  }, [loadTestResult]);

  const handleDownload = async (fileId: number, fileName: string) => {
    if (!testResult?.id) return;
    try {
      await medicalRecordsAPI.downloadFile(testResult.id, fileId, fileName);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  const handlePreview = async (file: TestResultFile) => {
    if (!testResult?.id || previewLoadingId !== null) return;
    setPreviewLoadingId(file.id);
    try {
      const { url } = await medicalRecordsAPI.getFilePreviewUrl(testResult.id, file.id, file.fileName);
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (err) {
      console.error('Failed to load file preview:', err);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleRetake = async () => {
    if (retaking) return;
    setRetaking(true);
    setRetakeError(null);
    try {
      await labTestAPI.start(labTest.id);
      onRetake();
    } catch (err) {
      setRetakeError(err instanceof Error ? err.message : 'Failed to reopen this test');
    } finally {
      setRetaking(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const confirmDelete = async () => {
    if (!testResult || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(testResult.id);
      setConfirmingDelete(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete test result. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Test Result Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-700">{error}</div>
        ) : testResult ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700"><span className="font-medium">Test:</span> {labTest.testName}</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Test ID:</span> {labTest.id}</p>
              <p className="text-sm text-gray-700"><span className="font-medium">Status:</span> {labTest.status}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Test Result Description</label>
              <p className="text-gray-900 whitespace-pre-wrap bg-green-50 p-3 rounded-lg border border-green-200 mt-1">
                {testResult.testResultDescription}
              </p>
            </div>

            {testResult.technicianNotes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Technician Notes</label>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200 mt-1">
                  {testResult.technicianNotes}
                </p>
              </div>
            )}

            {testResult.files.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Attached Files ({testResult.files.length})</label>
                <div className="mt-2 space-y-2">
                  {testResult.files.map(file => (
                    <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                      </div>
                      <button
                        onClick={() => handlePreview(file)}
                        disabled={previewLoadingId === file.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-[#38A3A5] hover:bg-[#38A3A5]/10 rounded-lg transition-colors text-sm disabled:opacity-50 flex-shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                        {previewLoadingId === file.id ? 'Loading...' : 'Preview'}
                      </button>
                      <button
                        onClick={() => handleDownload(file.id, file.fileName)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors text-sm flex-shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-500">Created At</label>
                <p className="text-gray-900">{new Date(testResult.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-gray-500">Updated At</label>
                <p className="text-gray-900">{new Date(testResult.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => onEdit(testResult)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Result
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Result
              </button>
              <button
                onClick={onClose}
                className="ml-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No test result found for this lab test.</p>
            {labTest.status === 'COMPLETED' && (
              <>
                <p className="text-sm text-gray-500 mb-4">This test is marked completed but its result is missing — you can reopen it to submit a new result.</p>
                {retakeError && (
                  <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm inline-block">
                    {retakeError}
                  </div>
                )}
                <div>
                  <button
                    onClick={handleRetake}
                    disabled={retaking}
                    className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors disabled:opacity-50"
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
          if (!deleting) {
            setConfirmingDelete(false);
            setDeleteError(null);
          }
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
