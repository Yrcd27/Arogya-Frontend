import { ApiError } from '../services/httpClient';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function normalizeEmail(value: string): string {
  return value.trim();
}

export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50;

export function getEmailError(value: string): string | undefined {
  const email = normalizeEmail(value);
  if (!email) return 'Please enter your email address.';
  if (email.length > EMAIL_MAX_LENGTH) return `Email address must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  const [local, domain] = email.split('@');
  if (
    local.length > 64 ||
    local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
    /[<>()[\]\\,;:"]/.test(local) ||
    domain.split('.').some(label => label.length > 63 || !/^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u.test(label))
  ) return 'Please enter a valid email address.';
  return undefined;
}

export function getUsernameError(value: string): string | undefined {
  const username = value.trim();
  if (!username) return 'Please enter a username.';
  if (username.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  if (username.length > USERNAME_MAX_LENGTH) return `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`;
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}‍ ._-]*$/u.test(username)) return 'Username must start with a letter or number and can only contain letters, numbers, spaces, dots, underscores, and hyphens.';
  return undefined;
}

export function getConfirmationError(password: string, confirmation: string): string | undefined {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return undefined;
}

export function getResetPasswordCriteria(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

export const PASSWORD_REQUIREMENTS =
  'Use at least 8 characters and at least 3 of: uppercase letters, lowercase letters, numbers, or special characters (!@#$%^&*(),.?":{}|<>).';

function countCharacterClasses(password: string): number {
  const criteria = getResetPasswordCriteria(password);
  return [criteria.uppercase, criteria.lowercase, criteria.number, criteria.special].filter(Boolean).length;
}

export function getPasswordPolicyError(password: string, emptyMessage: string): string | undefined {
  if (!password) return emptyMessage;
  if (password.length < 8 || countCharacterClasses(password) < 3) return PASSWORD_REQUIREMENTS;
  return undefined;
}

export function getResetPasswordError(password: string): string | undefined {
  return getPasswordPolicyError(password, 'Please enter a new password.');
}

export function getPasswordStrength(password: string): { level: 1 | 3 | 4; label: 'Weak' | 'Medium' | 'Strong' } {
  if (password.length < 8) return { level: 1, label: 'Weak' };
  const classes = countCharacterClasses(password);
  if (classes < 3) return { level: 1, label: 'Weak' };
  return classes === 3 ? { level: 3, label: 'Medium' } : { level: 4, label: 'Strong' };
}

export function getOtpError(value: string): string | undefined {
  return /^[0-9]{6}$/.test(value) ? undefined : 'Enter the complete 6-digit verification code using numbers only.';
}

export function getApiFieldErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
  aliases: Record<string, Field> = {},
): FieldErrors<Field> {
  const result: FieldErrors<Field> = {};
  if (!(error instanceof ApiError) || ![400, 413, 422].includes(error.status) || !error.errors) return result;
  for (const [key, message] of Object.entries(error.errors)) {
    const field = fields.find(candidate => candidate === key)
      ?? (Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : undefined);
    if (field && fields.includes(field) && typeof message === 'string' && message.trim()) result[field] = message;
  }
  return result;
}

export function focusFirstInvalidField(form: HTMLFormElement): void {
  window.requestAnimationFrame(() => {
    form.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')?.focus();
  });
}
