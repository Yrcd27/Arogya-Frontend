import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { medicalRecordsAPI, MAX_TEST_RESULT_FILES, type TestResult } from '../../services/medicalRecordsService';

interface EditTestResultModalProps {
  testResult: TestResult;
  onClose: () => void;
  onSuccess: () => void;
}

const VALID_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

export function EditTestResultModal({ testResult, onClose, onSuccess }: EditTestResultModalProps) {
  const [testResultDescription, setTestResultDescription] = useState(testResult.testResultDescription);
  const [technicianNotes, setTechnicianNotes] = useState(testResult.technicianNotes || '');
  const [keptFileIds, setKeptFileIds] = useState<number[]>(testResult.files.map(f => f.id));
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalFileCount = keptFileIds.length + newFiles.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    if (totalFileCount + selected.length > MAX_TEST_RESULT_FILES) {
      setError(`You can attach up to ${MAX_TEST_RESULT_FILES} files`);
      return;
    }

    for (const file of selected) {
      if (!VALID_FILE_TYPES.includes(file.type)) {
        setError('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each file must be less than 10MB');
        return;
      }
    }

    setNewFiles(prev => [...prev, ...selected]);
    setError('');
  };

  const removeExistingFile = (fileId: number) => {
    setKeptFileIds(prev => prev.filter(id => id !== fileId));
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!testResultDescription.trim()) {
      setError('Test result description is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const removeFileIds = testResult.files.map(f => f.id).filter(id => !keptFileIds.includes(id));
      await medicalRecordsAPI.update(testResult.id, {
        testResultDescription,
        technicianNotes,
        files: newFiles,
        removeFileIds
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update test result');
    } finally {
      setLoading(false);
    }
  };

  const keptFiles = testResult.files.filter(f => keptFileIds.includes(f.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={loading ? undefined : onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Edit Test Result</h3>
          <button onClick={onClose} disabled={loading} className="text-gray-500 hover:text-gray-700 disabled:opacity-40">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Result Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={testResultDescription}
              onChange={(e) => setTestResultDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              placeholder="Enter detailed test results..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Technician Notes (Optional)
            </label>
            <textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Files (up to {MAX_TEST_RESULT_FILES})
            </label>

            {keptFiles.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {keptFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{file.fileName}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingFile(file.id)}
                      className="text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${totalFileCount >= MAX_TEST_RESULT_FILES ? 'border-gray-200 opacity-50' : 'border-gray-300 hover:border-[#38A3A5]'}`}>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                disabled={totalFileCount >= MAX_TEST_RESULT_FILES}
                className="hidden"
                id="file-upload-edit"
              />
              <label htmlFor="file-upload-edit" className={totalFileCount >= MAX_TEST_RESULT_FILES ? 'cursor-not-allowed' : 'cursor-pointer'}>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {totalFileCount >= MAX_TEST_RESULT_FILES ? `Maximum of ${MAX_TEST_RESULT_FILES} files reached` : 'Click to add more files'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG (max 10MB each)
                </p>
              </label>
            </div>
            {newFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {newFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      className="text-red-600 hover:text-red-700 flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
