import { useEffect, useRef, useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { medicalRecordsAPI, MAX_TEST_RESULT_FILES, validateTestResultUpload } from '../../services/medicalRecordsService';
import { consultationAPI } from '../../services/consultationService';
import { LabTest } from '../../types/labTest';
import { ApiError } from '../../services/httpClient';
import { labTestAPI } from '../../services/labTestService';
import { useAuth } from '../../hooks/useAuth';
import { isPositiveId } from '../../utils/clinicalValidation';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { getTestResultFileError, getTestResultTextError, MAX_TEST_RESULT_TEXT_LENGTH, normalizeTestResultFile, TEST_RESULT_FIELDS, TEST_RESULT_FILE_ACCEPT, validateTestResult, type TestResultField } from '../../utils/testResultValidation';
import { MODAL_ALERT, MODAL_CLOSE, MODAL_INFO_PANEL, MODAL_OVERLAY, MODAL_TITLE, BUTTON_PRIMARY, BUTTON_SECONDARY, MODAL_PANEL_FLEX, MODAL_HEAD_FIXED, MODAL_BODY, MODAL_FOOT_FIXED } from '../dialogs/modalStyles';
import { NoTranslate } from '../NoTranslate';

interface SubmitTestResultModalProps {
  labTest: LabTest;
  technicianId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmitTestResultModal({ labTest, technicianId, onClose, onSuccess }: SubmitTestResultModalProps) {
  const { user, sessionKey } = useAuth();
  const contextKey = `${sessionKey}:${labTest.id}:${labTest.consultationId}:${technicianId}`;
  const currentContextRef = useRef(contextKey);
  currentContextRef.current = contextKey;
  const initialContextRef = useRef(contextKey);
  const savingRef = useRef(false);
  useEffect(() => {
    currentContextRef.current = contextKey;
    return () => { currentContextRef.current = ''; };
  }, [contextKey]);
  const [testResultDescription, setTestResultDescription] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TestResultField>>({});
  const [selectionError, setSelectionError] = useState('');
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const outcomeUnknownRef = useRef(false);

  const closeModal = () => { if (!savingRef.current) onClose(); };

  const changeText = (field: 'testResultDescription' | 'technicianNotes', value: string) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    if (field === 'testResultDescription') setTestResultDescription(value);
    else setTechnicianNotes(value);
    setError('');
    setFieldErrors(previous => ({ ...previous, [field]: previous[field] ? getTestResultTextError(field, value) : undefined }));
  };

  const fieldProps = (field: TestResultField) => ({
    id: `submit-result-${field}`,
    disabled: loading || outcomeUnknown,
    'aria-invalid': !!fieldErrors[field],
    'aria-describedby': fieldErrors[field] ? `submit-result-${field}-error` : undefined,
  });

  const fieldError = (field: TestResultField) => fieldErrors[field]
    ? <p id={`submit-result-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors[field]}</p> : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    const selected = Array.from(e.target.files || []).map(normalizeTestResultFile);
    e.target.value = '';
    if (selected.length === 0) return;

    const message = getTestResultFileError([...files, ...selected]);
    setSelectionError(message || '');
    setFieldErrors(previous => ({ ...previous, files: message }));
    if (message) return;
    setFiles(previous => [...previous, ...selected]);
    setError('');
  };

  const removeFile = (index: number) => {
    if (savingRef.current || outcomeUnknownRef.current) return;
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSelectionError('');
    setFieldErrors(previous => ({ ...previous, files: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || outcomeUnknownRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    setError('');
    if (initialContextRef.current !== contextKey || !isPositiveId(user?.id) || !isPositiveId(labTest.id) || !isPositiveId(labTest.consultationId) || !isPositiveId(technicianId)) {
      setError('The technician or lab test could not be verified. Reopen the test from the worklist.');
      return;
    }
    const errors = validateTestResult(testResultDescription, files, 0, technicianNotes);
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
      try {
        const existing = await medicalRecordsAPI.getByLabTestId(labTest.id);
        if (!isCurrent()) return;
        throw new Error(isPositiveId(existing?.id) ? 'A result already exists for this lab test. Refresh the worklist before editing it.' : 'The result availability could not be verified. Refresh the worklist before submitting.');
      } catch (existingErr) {
        if (!(existingErr instanceof ApiError && existingErr.status === 404)) throw existingErr;
      }
      if (!isCurrent()) return;
      const currentTest = await labTestAPI.get(labTest.id);
      if (!isCurrent()) return;
      if (currentTest.id !== labTest.id || currentTest.consultationId !== labTest.consultationId || currentTest.status !== 'IN_PROGRESS'
        || currentTest.assignedTechnicianId != null && currentTest.assignedTechnicianId !== technicianId) {
        throw new Error('This test is no longer in progress for this technician. Refresh the worklist before submitting.');
      }
      const consultation = await consultationAPI.get(labTest.consultationId);
      if (!isCurrent()) return;
      if (consultation.id !== labTest.consultationId || !isPositiveId(consultation.patientId)) throw new Error('Unable to verify the patient for this lab test. Refresh the worklist before submitting.');
      const payload = {
        labTestId: labTest.id,
        patientId: consultation.patientId,
        technicianId,
        testResultDescription: testResultDescription.trim(),
        technicianNotes: technicianNotes.trim(),
        files
      };
      await validateTestResultUpload(payload);
      if (!isCurrent()) return;
      writePending = true;
      const created = await medicalRecordsAPI.create(payload);
      if (!isPositiveId(created?.id) || created.labTestId !== labTest.id || created.patientId !== consultation.patientId) throw new Error('The result service did not confirm the saved result for this test and patient.');
      writePending = false;
      if (isCurrent()) onSuccess();
    } catch (err) {
      if (!isCurrent()) return;
      const errors = getApiFieldErrors(err, TEST_RESULT_FIELDS);
      setFieldErrors(errors);
      if (Object.keys(errors).length) focusFirstInvalidField(form);
      else setError(err instanceof Error ? err.message : 'Failed to submit test result');
      if (writePending && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500)) {
        outcomeUnknownRef.current = true;
        setOutcomeUnknown(true);
        setError('The save outcome is unconfirmed. Your draft and files are still here. Check the worklist to see whether a result was saved before submitting again to avoid duplicate results or attachments.');
      }
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={`${MODAL_OVERLAY} z-50`} onClick={closeModal}>
      <div role="dialog" aria-modal="true" aria-label="Submit test result" className={`${MODAL_PANEL_FLEX} max-w-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={MODAL_HEAD_FIXED}>
          <h3 className={MODAL_TITLE}>Submit Test Result</h3>
          <button type="button" aria-label="Close submit result" onClick={closeModal} disabled={loading} className={MODAL_CLOSE}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className={MODAL_BODY}>

        <div className={`mb-4 ${MODAL_INFO_PANEL} space-y-1`}>
          <p className="text-sm text-gray-700"><span className="font-medium">Test:</span> <NoTranslate>{labTest.testName}</NoTranslate></p>
          <p className="text-sm text-gray-700"><span className="font-medium">Test ID:</span> {labTest.id}</p>
          {labTest.testDescription && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700">Description:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{labTest.testDescription}</p>
            </div>
          )}
          {labTest.testInstructions && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm font-medium text-amber-800">Doctor's Instructions:</p>
              <p className="text-sm text-amber-700 whitespace-pre-wrap">{labTest.testInstructions}</p>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className={`mb-4 ${MODAL_ALERT}`}>
            {error}
          </div>
        )}

        <form id="submit-result-form" onSubmit={handleSubmit} noValidate aria-busy={loading} className="space-y-4">
          <div>
            <label htmlFor="submit-result-testResultDescription" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="submit-result-technicianNotes" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="submit-result-files" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Files (Optional, up to {MAX_TEST_RESULT_FILES})
            </label>
            <div role="group" aria-label="Result attachments" tabIndex={-1} aria-invalid={!!fieldErrors.files} aria-describedby={fieldErrors.files ? 'submit-result-files-error' : undefined} className={`form-control-focus border-2 border-dashed rounded-lg p-4 text-center transition-colors ${files.length >= MAX_TEST_RESULT_FILES ? 'border-gray-200 opacity-50' : 'border-gray-300 hover:border-[#38A3A5]'}`}>
              <input
                {...fieldProps('files')}
                type="file"
                onChange={handleFileChange}
                accept={TEST_RESULT_FILE_ACCEPT}
                multiple
                disabled={loading || outcomeUnknown || files.length >= MAX_TEST_RESULT_FILES}
                className="sr-only peer"
              />
              <label htmlFor="submit-result-files" className={`form-control-focus block rounded ${loading || files.length >= MAX_TEST_RESULT_FILES ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {files.length >= MAX_TEST_RESULT_FILES ? `Maximum of ${MAX_TEST_RESULT_FILES} files reached` : 'Choose files to upload'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, JPG, PNG. Complete upload: 10 MiB including text and metadata.
                </p>
              </label>
            </div>
            {fieldError('files')}
            {selectionError && <button type="button" disabled={loading || outcomeUnknown} onClick={() => { if (savingRef.current || outcomeUnknownRef.current) return; setSelectionError(''); setFieldErrors(previous => ({ ...previous, files: undefined })); }} className="mt-1 text-sm text-[#2d8284] underline">Discard rejected selection; keep current attachments</button>}
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1"><NoTranslate>{file.name}</NoTranslate> ({(file.size / 1024).toFixed(2)} KB)</span>
                    <button
                      type="button"
                      disabled={loading || outcomeUnknown}
                      onClick={() => removeFile(index)}
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
            form="submit-result-form"
            className={BUTTON_PRIMARY}
            disabled={loading || outcomeUnknown}
          >
            {loading ? 'Submitting...' : 'Submit Result'}
          </button>
        </div>
      </div>
    </div>
  );
}
