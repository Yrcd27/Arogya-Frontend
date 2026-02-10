import { useState, useEffect } from 'react';
import { X, Download, Edit, Trash2, FileText } from 'lucide-react';
import { LabTest } from '../../types/labTest';
import { medicalRecordsAPI } from '../../services/medicalRecordsService';

interface TestResult {
  id: number;
  labTestId: number;
  patientId: number;
  technicianId: number;
  testResultDescription: string;
  technicianNotes?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

interface TestResultDetailsModalProps {
  labTest: LabTest;
  onClose: () => void;
  onEdit: (result: TestResult) => void;
  onDelete: (resultId: number) => void;
}

export function TestResultDetailsModal({ labTest, onClose, onEdit, onDelete }: TestResultDetailsModalProps) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestResult();
  }, [labTest.id]);

  const loadTestResult = async () => {
    try {
      const result = await medicalRecordsAPI.getByLabTestId(labTest.id);
      setTestResult(result);
    } catch (err) {
      console.error('Failed to load test result:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!testResult?.id) return;
    try {
      await medicalRecordsAPI.downloadFile(testResult.id);
    } catch (err) {
      console.error('Failed to download file:', err);
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

            {testResult.fileName && (
              <div>
                <label className="text-sm font-medium text-gray-500">Attached File</label>
                <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{testResult.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(testResult.fileSize)}</p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
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
                onClick={() => {
                  if (confirm('Are you sure you want to delete this test result?')) {
                    onDelete(testResult.id);
                  }
                }}
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
          <div className="text-center py-8 text-gray-600">No test result found for this lab test.</div>
        )}
      </div>
    </div>
  );
}
