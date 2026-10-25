import type { DoctorProfile, TechnicianProfile } from '../types/user';

export type StaffKind = 'doctor' | 'technician';
export type StaffProfile = DoctorProfile | TechnicianProfile;

export const NOT_PROVIDED = 'Not provided';

export function displayNameParts(profile: StaffProfile, kind: StaffKind): { prefix: string; name: string } {
  const name = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.user?.username || profile.user?.email || `Unnamed ${kind}`;
  return { prefix: kind === 'doctor' && !/^dr\.?\s/i.test(name) ? 'Dr. ' : '', name };
}

export function displayName(profile: StaffProfile, kind: StaffKind): string {
  const { prefix, name } = displayNameParts(profile, kind);
  return `${prefix}${name}`;
}

export function initials(name: string): string {
  const letters = name.replace(/^dr\.?\s+/i, '').split(/\s+/)
    .map(part => part.match(/[\p{L}\p{N}]/u)?.[0] ?? '')
    .join('').slice(0, 2).toUpperCase();
  return letters || '?';
}

export function speciality(profile: StaffProfile, kind: StaffKind): string {
  return (kind === 'doctor' ? (profile as DoctorProfile).specialization : (profile as TechnicianProfile).technicianField) || '';
}

export function value(input: string | number | null | undefined): string {
  return input === undefined || input === null || String(input).trim() === '' ? NOT_PROVIDED : String(input);
}
