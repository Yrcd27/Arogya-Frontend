import { useEffect, useRef, useState } from 'react';
import { X, XCircle, Upload, FileText } from 'lucide-react';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { medicalRecordsAPI, MAX_TEST_RESULT_FILES, validateTestResultUpload, type TestResult } from '../../services/medicalRecordsService';
import { useAuth } from '../../hooks/useAuth';
import { isPositiveId } from '../../utils/clinicalValidation';
import { ApiError } from '../../services/httpClient';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { getTestResultFileError, getTestResultTextError, MAX_TEST_RESULT_TEXT_LENGTH, normalizeTestResultFile, TEST_RESULT_FIELDS, TEST_RESULT_FILE_ACCEPT, validateTestResult, type TestResultField } from '../../utils/testResultValidation';
import { MODAL_ALERT, MODAL_CLOSE, MODAL_OVERLAY, MODAL_TITLE, BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_PANEL_FLEX, MODAL_HEAD_FIXED, MODAL_BODY, MODAL_FOOT_FIXED } from '../dialogs/modalStyles';
import { NoTranslate } from '../NoTranslate';

interface EditTestResultModalProps {
  testResult: TestResult;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTestResultModal({ testResult, onClose, onSuccess }: EditTestResultModalProps) {
  const { user, sessionKey } = useAuth();
  const contextKey = `${sessionKey}:${testResult.id}:${testResult.labTestId}:${testResult.patientId}`;
  const currentContextRef = useRef(contextKey);
  currentContextRef.current = contextKey;
  const initialContextRef = useRef(contextKey);
  const savingRef = useRef(false);
  useEffect(() => {
    currentContextRef.current = contextKey;
    return () => { currentContextRef.current = ''; };
  }, [contextKey]);
  const [testResultDescription, setTestResultDescription] = useState(testResult.testResultDescription);
  const [technicianNotes, setTechnicianNotes] = useState(testResult.technicianNotes || '');
  const [keptFileIds, setKeptFileIds] = useState<number[]>(testResult.files.map(f => f.id));
  const [fileToRemove, setFileToRemove] = useState<{ id: number; context: string } | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TestResultField>>({});
  const [selectionError, setSelectionError] = useState('');
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const outcomeUnknownRef = useRef(false);

  const totalFileCount = keptFileIds.length + newFiles.length;

  const closeModal = () => { if (!savingRef.current) onClose(); };

  const changeText = (field: 'testResultDescription' | 'technicianNotes', value: string) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    if (field === 'testResultDescription') setTestResultDescription(value);
    else setTechnicianNotes(value);
    setError('');
    setFieldErrors(previous => ({ ...previous, [field]: previous[field] ? getTestResultTextError(field, value) : undefined }));
  };

  const fieldProps = (field: TestResultField) => ({
    id: `edit-result-${field}`,
    disabled: loading || outcomeUnknown,
    'aria-invalid': !!fieldErrors[field],
    'aria-describedby': fieldErrors[field] ? `edit-result-${field}-error` : undefined,
  });

  const fieldError = (field: TestResultField) => fieldErrors[field]
    ? <p id={`edit-result-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors[field]}</p> : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    const selected = Array.from(e.target.files || []).map(normalizeTestResultFile);
    e.target.value = '';
    if (selected.length === 0) return;

    const message = getTestResultFileError([...newFiles, ...selected], keptFileIds.length);
    setSelectionError(message || '');
    setFieldErrors(previous => ({ ...previous, files: message }));
    if (message) return;
    setNewFiles(prev => [...prev, ...selected]);
    setError('');
  };

  const removeExistingFile = (fileId: number) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    if (!fileToRemove || fileToRemove.id !== fileId || fileToRemove.context !== currentContextRef.current
      || initialContextRef.current !== contextKey || !keptFileIds.includes(fileId)
      || !testResult.files.some(file => file.id === fileId)) return;
    setKeptFileIds(prev => prev.filter(id => id !== fileId));
    setSelectionError('');
    setFieldErrors(previous => ({ ...previous, files: undefined }));
    setFileToRemove(null);
  };

  const removeNewFile = (index: number) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setSelectionError('');
    setFieldErrors(previous => ({ ...previous, files: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || outcomeUnknownRef.current || fileToRemove) return;
    const form = e.currentTarget as HTMLFormElement;
    setError('');
    if (initialContextRef.current !== contextKey || !isPositiveId(user?.id) || !isPositiveId(testResult.id) || !isPositiveId(testResult.labTestId) || !isPositiveId(testResult.patientId)) {
      setError('The result or signed-in user could not be verified. Reopen the result before editing.');
      return;
    }
    const errors = validateTestResult(testResultDescription, newFiles, keptFileIds.length, technicianNotes);
    if (testResult.files.some(file => !isPositiveId(file.id)) || keptFileIds.some(id => !isPositiveId(id) || !testResult.files.some(file => file.id === id)) || new Set(keptFileIds).size !== keptFileIds.length) errors.files = 'The existing attachments could not be verified. Reopen the result before saving.';
    if (selectionError) errors.files = selectionError;
    setFieldErrors(errors);
    if (Object.keys(errors).length) { focusFirstInvalidField(form); return; }
    const requestContext = contextKey;
    const isCurrent = () => currentContextRef.current === requestContext;
    savingRef.current = true;
    setLoading(true);
    setError('');

    let writePending = false;
    try {
      const removeFileIds = testResult.files.map(f => f.id).filter(id => !keptFileIds.includes(id));
      const current = await medicalRecordsAPI.getByLabTestId(testResult.labTestId);
      if (!isCurrent()) return;
      if (current.id !== testResult.id || current.labTestId !== testResult.labTestId || current.patientId !== testResult.patientId) throw new Error('This result no longer matches the selected test and patient. Reopen it before saving.');
      const totalFilesAfterSave = current.files.filter(file => !removeFileIds.includes(file.id)).length + newFiles.length;
      if (totalFilesAfterSave > MAX_TEST_RESULT_FILES) {
        setFieldErrors({ files: 'The attachments changed since you opened this result. Reopen it before adding more files.' });
        focusFirstInvalidField(form);
        return;
      }
      const payload = {
        testResultDescription: testResultDescription.trim(),
        technicianNotes: technicianNotes.trim(),
        files: newFiles,
        removeFileIds
      };
      await validateTestResultUpload(payload);
      if (!isCurrent()) return;
      writePending = true;
      const updated = await medicalRecordsAPI.update(testResult.id, payload);
      if (updated?.id !== testResult.id || updated.labTestId !== testResult.labTestId || updated.patientId !== testResult.patientId) throw new Error('The result service did not confirm the saved update for this test and patient.');
      writePending = false;
      if (isCurrent()) onSuccess();
    } catch (err) {
      if (!isCurrent()) return;
      const errors = getApiFieldErrors(err, TEST_RESULT_FIELDS, { removeFileIds: 'files' });
      setFieldErrors(errors);
      if (Object.keys(errors).length) focusFirstInvalidField(form);
      else setError(err instanceof Error ? err.message : 'Failed to update test result');
      if (writePending && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500)) {
        outcomeUnknownRef.current = true;
        setOutcomeUnknown(true);
        setError('The save outcome is unconfirmed. Your draft and files are still here. Reopen the saved result from the worklist before submitting again to avoid duplicate attachments or overwriting a completed update.');
      }
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  const keptFiles = testResult.files.filter(f => keptFileIds.includes(f.id));

  return (
    <>
    <div className={`${MODAL_OVERLAY} z-50`} onClick={closeModal}>
      <div role="dialog" aria-modal="true" aria-label="Edit test result" className={`${MODAL_PANEL_FLEX} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={MODAL_HEAD_FIXED}>
          <h3 className={MODAL_TITLE}>Edit Test Result</h3>
          <button type="button" aria-label="Close edit result" onClick={closeModal} disabled={loading} className={MODAL_CLOSE}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className={MODAL_BODY}>

        {error && (
          <div role="alert" className={`mb-4 ${MODAL_ALERT}`}>
            {error}
          </div>
        )}

        <form id="edit-result-form" onSubmit={handleSubmit} noValidate aria-busy={loading} className="space-y-4">
          <div>
            <label htmlFor="edit-result-testResultDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Test Result Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...fieldProps('testResultDescription')}
              value={testResultDescription}
              onChange={e => changeText('testResultDescription', e.target.value)}
              onBlur={() => setFieldErrors(previous => ({ ...previous, testResultDescription: getTestResultTextError('testResultDescription', testResultDescription) }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              placeholder="Enter detailed test results..."
              required
            />
            {fieldError('testResultDescription')}
            <p className="mt-1 text-xs text-gray-500">{testResultDescription.trim().length} / {MAX_TEST_RESULT_TEXT_LENGTH} characters</p>
          </div>

          <div>
            <label htmlFor="edit-result-technicianNotes" className="block text-sm font-medium text-gray-700 mb-2">
              Technician Notes (Optional)
            </label>
            <textarea
              {...fieldProps('technicianNotes')}
              value={technicianNotes}
              onChange={e => changeText('technicianNotes', e.target.value)}
              onBlur={() => setFieldErrors(previous => ({ ...previous, technicianNotes: getTestResultTextError('technicianNotes', technicianNotes) }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              placeholder="Additional notes..."
            />
            {fieldError('technicianNotes')}
            <p className="mt-1 text-xs text-gray-500">{technicianNotes.trim().length} / {MAX_TEST_RESULT_TEXT_LENGTH} characters</p>
          </div>

          <div>
            <label htmlFor="edit-result-files" className="block text-sm font-medium text-gray-700 mb-2">
              Files (up to {MAX_TEST_RESULT_FILES})
            </label>

            {keptFiles.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {keptFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span translate="no" className="notranslate truncate flex-1">{file.fileName}</span>
                    <button
                      type="button"
                      disabled={loading || outcomeUnknown}
                      onClick={() => setFileToRemove({ id: file.id, context: contextKey })}
                      aria-label={`Remove ${file.fileName}`}
                      title="Remove Attachment"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <XCircle aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div role="group" aria-label="Result attachments" tabIndex={-1} aria-invalid={!!fieldErrors.files} aria-describedby={fieldErrors.files ? 'edit-result-files-error' : undefined} className={`form-control-focus border-2 border-dashed rounded-lg p-4 text-center transition-colors ${totalFileCount >= MAX_TEST_RESULT_FILES ? 'border-gray-200 opacity-50' : 'border-gray-300 hover:border-[#38A3A5]'}`}>
              <input
                {...fieldProps('files')}
                type="file"
                onChange={handleFileChange}
                accept={TEST_RESULT_FILE_ACCEPT}
                multiple
                disabled={loading || outcomeUnknown || totalFileCount >= MAX_TEST_RESULT_FILES}
                className="sr-only peer"
              />
              <label htmlFor="edit-result-files" className={`form-control-focus block rounded ${loading || totalFileCount >= MAX_TEST_RESULT_FILES ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {totalFileCount >= MAX_TEST_RESULT_FILES ? `Maximum of ${MAX_TEST_RESULT_FILES} files reached` : 'Click to add more files'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG. Complete upload: 10 MiB including new files, text, and metadata.
                </p>
              </label>
            </div>
            {fieldError('files')}
            {selectionError && <button type="button" disabled={loading || outcomeUnknown} onClick={() => { if (savingRef.current || outcomeUnknownRef.current) return; setSelectionError(''); setFieldErrors(previous => ({ ...previous, files: undefined })); }} className="mt-1 text-sm text-[#2d8284] underline">Discard rejected selection; keep current attachments</button>}
            {newFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {newFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1"><NoTranslate>{file.name}</NoTranslate> ({(file.size / 1024).toFixed(2)} KB)</span>
                    <button
                      type="button"
                      disabled={loading || outcomeUnknown}
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

        </form>
        </div>

        <div className={MODAL_FOOT_FIXED}>
          <button
            type="button"
            onClick={closeModal}
            className={BUTTON_SECONDARY}
            disabled={loading}
          >
            {outcomeUnknown ? 'Close and review worklist' : 'Cancel'}
          </button>
          <button
            type="submit"
            form="edit-result-form"
            className={BUTTON_PRIMARY}
            disabled={loading || outcomeUnknown}
          >
            {loading ? 'Updating...' : 'Update Result'}
          </button>
        </div>
      </div>
    </div>
    <ConfirmDialog
      isOpen={fileToRemove !== null && fileToRemove.context === contextKey}
      title="Remove Attachment?"
      message={<>Remove "<NoTranslate>{testResult.files.find(file => file.id === fileToRemove?.id)?.fileName ?? 'this attachment'}</NoTranslate>" from this result? The file will be deleted when you select Update Result.</>}
      confirmLabel="Remove Attachment"
      cancelLabel="Keep Attachment"
      loading={loading}
      onCancel={() => setFileToRemove(null)}
      onConfirm={() => { if (fileToRemove) removeExistingFile(fileToRemove.id); }}
    />
    </>
  );
}
