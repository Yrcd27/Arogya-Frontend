import { MAX_TEST_RESULT_FILES } from '../services/medicalRecordsService';
import type { FieldErrors } from './formValidation';

export const MAX_TEST_RESULT_FILE_BYTES = 10 * 1024 * 1024;
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
  return undefined;
}

export function validateTestResult(description: string, files: readonly File[], keptFileCount = 0): FieldErrors<TestResultField> {
  const errors: FieldErrors<TestResultField> = {};
  if (!description.trim()) errors.testResultDescription = 'Test result description is required.';
  const fileError = getTestResultFileError(files, keptFileCount);
  if (fileError) errors.files = fileError;
  return errors;
}
