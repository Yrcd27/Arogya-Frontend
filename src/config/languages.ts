export const specificLanguages = [
  { value: 'en', label: 'English', countryCode: 'gb' },
  { value: 'si', label: 'Sinhala', countryCode: 'lk' },
  { value: 'ta', label: 'Tamil', countryCode: 'lk' },
] as const;

export type LanguageCode = (typeof specificLanguages)[number]['value'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return specificLanguages.some(language => language.value === value);
}
