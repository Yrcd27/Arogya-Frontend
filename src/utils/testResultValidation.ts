import { MAX_TEST_RESULT_FILES, MAX_TEST_RESULT_REQUEST_BYTES } from '../services/medicalRecordsService';
import type { FieldErrors } from './formValidation';

export const MAX_TEST_RESULT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TEST_RESULT_TEXT_LENGTH = 4000;
export const TEST_RESULT_FILE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
export const TEST_RESULT_FIELDS = ['testResultDescription', 'technicianNotes', 'files'] as const;
export type TestResultField = (typeof TEST_RESULT_FIELDS)[number];

const FILE_EXTENSIONS: Record<string, readonly string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export function getTestResultFileError(files: readonly File[], keptFileCount = 0): string | undefined {
  if (!Number.isSafeInteger(keptFileCount) || keptFileCount < 0 || files.length + keptFileCount > MAX_TEST_RESULT_FILES) {
    return `You can attach up to ${MAX_TEST_RESULT_FILES} files, including existing attachments.`;
  }
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size <= 0) return `“${file.name}” is empty or could not be read. Choose a non-empty file.`;
    if (file.size > MAX_TEST_RESULT_FILE_BYTES) return `“${file.name}” exceeds the 10 MiB per-file limit.`;
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const extensions = Object.prototype.hasOwnProperty.call(FILE_EXTENSIONS, file.type) ? FILE_EXTENSIONS[file.type] : [];
    if (!extensions.includes(extension)) return `“${file.name}” has an unsupported or mismatched file type. Use PDF, DOC, DOCX, JPG, JPEG, or PNG with matching file metadata.`;
  }
  if (files.reduce((total, file) => total + file.size, 0) >= MAX_TEST_RESULT_REQUEST_BYTES) {
    return 'New attachments must total less than 10 MiB to leave room for text and upload metadata.';
  }
  return undefined;
}

export function getTestResultTextError(field: 'testResultDescription' | 'technicianNotes', value: string): string | undefined {
  const text = value.trim();
  if (field === 'testResultDescription' && !text) return 'Test result description is required.';
  if (text.length > MAX_TEST_RESULT_TEXT_LENGTH) return `${field === 'testResultDescription' ? 'Test result description' : 'Technician notes'} must be ${MAX_TEST_RESULT_TEXT_LENGTH} characters or fewer.`;
  return undefined;
}

export function validateTestResult(description: string, files: readonly File[], keptFileCount = 0, notes = ''): FieldErrors<TestResultField> {
  const errors: FieldErrors<TestResultField> = {};
  const descriptionError = getTestResultTextError('testResultDescription', description);
  const notesError = getTestResultTextError('technicianNotes', notes);
  if (descriptionError) errors.testResultDescription = descriptionError;
  if (notesError) errors.technicianNotes = notesError;
  const fileError = getTestResultFileError(files, keptFileCount);
  if (fileError) errors.files = fileError;
  return errors;
}
