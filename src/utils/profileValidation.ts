import type { FieldErrors } from './formValidation';

export const PROFILE_FIELDS = {
  patient: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'nicNumber', 'gender', 'bloodGroup', 'allergies', 'chronicDiseases', 'address', 'emergencyContact'],
  doctor: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'nicNumber', 'licenseNumber', 'specialization', 'experienceYears', 'qualification'],
  technician: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'nicNumber', 'technicianField', 'licenseNumber', 'certification', 'assignedEquipment'],
  admin: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'nicNumber'],
} as const;

export type ProfileRole = keyof typeof PROFILE_FIELDS;
export type ProfileField = (typeof PROFILE_FIELDS)[ProfileRole][number];
export type ProfileValues = Partial<Record<ProfileField, string | number>>;

export const PROFILE_OPTIONS = {
  gender: ['Male', 'Female'],
  bloodGroup: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  specialization: ['Cardiology', 'Dermatology', 'Endocrinology', 'Family Medicine', 'Gastroenterology', 'Internal Medicine', 'Neurology', 'Oncology', 'Pediatrics', 'Psychiatry', 'Pulmonology', 'Radiology', 'Surgery', 'Urology', 'Other'],
  technicianField: ['Radiology', 'Laboratory', 'Pharmacy', 'Cardiovascular', 'Respiratory', 'Emergency Medical', 'Surgical', 'Dental', 'Ophthalmic', 'Dialysis', 'Other'],
} as const;

const FIELD_LABELS: Record<ProfileField, string> = {
  firstName: 'First name', lastName: 'Last name', dateOfBirth: 'Date of birth',
  phoneNumber: 'Phone number', nicNumber: 'NIC number', gender: 'Gender', bloodGroup: 'Blood group',
  allergies: 'Allergies', chronicDiseases: 'Chronic diseases', address: 'Address', emergencyContact: 'Emergency contact',
  licenseNumber: 'License number', specialization: 'Specialization', experienceYears: 'Experience in years',
  qualification: 'Medical qualifications', technicianField: 'Technician field', certification: 'Certification', assignedEquipment: 'Assigned equipment',
};

const FIXED_AREA_CODES = new Set([
  '11', '21', '23', '24', '25', '26', '27', '31', '32', '33', '34', '35', '36', '37', '38',
  '41', '45', '47', '51', '52', '54', '55', '57', '63', '65', '66', '67', '81', '91',
]);

function parsePhone(value: string): string | undefined {
  const text = value.trim();
  if (!/^[+0-9\s()-]+$/.test(text) || !/^(?:\+94|0|\(0)/.test(text)) return undefined;
  const brackets = text.match(/[()]/g)?.join('') || '';
  if (brackets !== '' && brackets !== '()') return undefined;
  const compact = text.replace(/[\s()-]/g, '');
  const national = /^0[0-9]{9}$/.test(compact) ? compact.slice(1)
    : /^\+94[0-9]{9}$/.test(compact) ? compact.slice(3) : undefined;
  if (!national) return undefined;
  const mobile = /^7[01245678][0-9]{7}$/.test(national);
  const fixed = FIXED_AREA_CODES.has(national.slice(0, 2));
  return mobile || fixed ? `+94${national}` : undefined;
}

export function normalizeSriLankanPhone(value: string): string {
  return parsePhone(value) ?? value.trim();
}

export function getPhoneError(value: string, label = 'Phone number', required = false): string | undefined {
  if (!value.trim()) return required ? `${label} is required.` : undefined;
  return parsePhone(value) ? undefined : `Enter a valid Sri Lankan mobile or landline number for ${label.toLowerCase()} (e.g. 0771234567 or +94112345678).`;
}

export function getNicError(value: string, required = false): string | undefined {
  const nic = value.trim();
  if (!nic) return required ? 'NIC number is required.' : undefined;
  return /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/.test(nic)
    ? undefined : 'Enter 9 digits followed by V/X, or a 12-digit NIC number.';
}

export function localDateString(date = new Date()): string {
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export function getDateOfBirthError(value: string, required = false, today = localDateString()): string | undefined {
  const text = value.trim();
  if (!text) return required ? 'Date of birth is required.' : undefined;
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(text)) return 'Enter a valid date of birth.';
  const [year, month, day] = text.split('-').map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return 'Enter a valid date of birth.';
  return text > today ? 'Date of birth cannot be in the future.' : undefined;
}

export function normalizeProfileField(field: ProfileField, value: string | number): string {
  const text = String(value).trim();
  if (field === 'nicNumber') return text.toUpperCase();
  if (field === 'phoneNumber' || field === 'emergencyContact') return normalizeSriLankanPhone(text);
  return text;
}

export function getProfileFieldError(role: ProfileRole, field: ProfileField, value: string | number, originalValue?: string | number): string | undefined {
  const text = String(value).trim();
  const required = role === 'patient' ? field === 'firstName' || field === 'lastName' : true;
  if (field === 'dateOfBirth') return getDateOfBirthError(text, required);
  if (field === 'phoneNumber' || field === 'emergencyContact') return getPhoneError(text, FIELD_LABELS[field], required);
  if (field === 'nicNumber') return getNicError(text, required);
  if (required && !text) return `${FIELD_LABELS[field]} is required.`;
  if (field === 'experienceYears') {
    if (!/^[0-9]+$/.test(text) || !Number.isInteger(Number(text)) || Number(text) < 0 || Number(text) > 50) {
      return 'Enter a whole number of years from 0 to 50.';
    }
  }
  if (field in PROFILE_OPTIONS && text) {
    const options: readonly string[] = PROFILE_OPTIONS[field as keyof typeof PROFILE_OPTIONS];
    const unchangedStoredValue = originalValue !== undefined && text === String(originalValue).trim();
    if (!options.includes(text) && !unchangedStoredValue) return `Select a valid ${FIELD_LABELS[field].toLowerCase()}.`;
  }
  return undefined;
}

export function validateProfile(role: ProfileRole, values: ProfileValues, originalValues: ProfileValues = {}): FieldErrors<ProfileField> {
  const errors: FieldErrors<ProfileField> = {};
  for (const field of PROFILE_FIELDS[role]) {
    const message = getProfileFieldError(role, field, values[field] ?? '', originalValues[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

export function normalizeProfile<T extends ProfileValues>(role: ProfileRole, values: T): T {
  const normalized: ProfileValues = {};
  for (const field of PROFILE_FIELDS[role]) normalized[field] = normalizeProfileField(field, values[field] ?? '');
  return { ...values, ...normalized };
}
