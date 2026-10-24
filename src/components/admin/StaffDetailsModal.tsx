import type { ReactNode } from 'react';
import { Activity, Briefcase, Calendar, CreditCard, FileText, Mail, Phone, User, Wrench, type LucideIcon } from 'lucide-react';
import { BaseModal } from '../dialogs/BaseModal';
import { BUTTON_SECONDARY, DETAIL_LABEL, DETAIL_VALUE } from '../dialogs/modalStyles';
import { DetailText } from '../dialogs/DetailItem';
import { getAge } from '../../utils/profileValidation';
import type { DoctorProfile, TechnicianProfile } from '../../types/user';

export type StaffKind = 'doctor' | 'technician';
export type StaffProfile = DoctorProfile | TechnicianProfile;

const NOT_PROVIDED = 'Not provided';

export function displayName(profile: StaffProfile, kind: StaffKind): string {
  const name = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.user?.username || profile.user?.email || `Unnamed ${kind}`;
  return kind === 'doctor' && !/^dr\.?\s/i.test(name) ? `Dr. ${name}` : name;
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

function Field({ icon: Icon, label, children, missing }: { icon: LucideIcon; label: string; children: ReactNode; missing?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#38A3A5]" />
      <div className="min-w-0">
        <p className={DETAIL_LABEL}>{label}</p>
        <p className={missing ? 'mt-1.5 break-words text-sm leading-5 text-gray-500' : DETAIL_VALUE}>{children}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-5">
      <h4 className="mb-3 text-base font-semibold text-gray-900">{title}</h4>
      {children}
    </div>
  );
}

export function StaffDetailsModal({ kind, profile, onClose }: { kind: StaffKind; profile: StaffProfile | null; onClose: () => void }) {
  const doctor = kind === 'doctor' ? profile as DoctorProfile | null : null;
  const technician = kind === 'technician' ? profile as TechnicianProfile | null : null;
  const age = getAge(profile?.dateOfBirth);
  const years = doctor?.experienceYears;
  const dob = profile?.dateOfBirth?.trim();
  const specialityText = profile ? speciality(profile, kind) : '';

  return (
    <BaseModal isOpen={profile !== null} title={kind === 'doctor' ? 'Doctor Profile' : 'Technician Profile'} size="lg" onClose={onClose}
      footer={<div className="flex justify-end"><button type="button" onClick={onClose} className={BUTTON_SECONDARY}>Close</button></div>}>
      {profile && (
        <div className="space-y-5">
          <div className="rounded-lg bg-gradient-to-r from-[#38A3A5] to-[#2d8284] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
                <User aria-hidden="true" className="h-6 w-6 text-[#38A3A5]" />
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-xl font-bold">{displayName(profile, kind)}</h3>
                {specialityText && <p className="mt-1 break-words text-white/90">{specialityText}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field icon={Calendar} label="Date of Birth" missing={!dob}>
              {dob || NOT_PROVIDED}
              {dob && age !== undefined && <span className="ml-2 text-sm text-gray-600">({age} years old)</span>}
            </Field>
            <Field icon={CreditCard} label="NIC Number" missing={value(profile.nicNumber) === NOT_PROVIDED}>{value(profile.nicNumber)}</Field>
            <Field icon={Mail} label="Email" missing={value(profile.user?.email) === NOT_PROVIDED}>{value(profile.user?.email)}</Field>
            <Field icon={User} label="Username" missing={value(profile.user?.username) === NOT_PROVIDED}>{value(profile.user?.username)}</Field>
          </div>

          <Section title="Contact Information">
            <Field icon={Phone} label="Phone Number" missing={value(profile.phoneNumber) === NOT_PROVIDED}>{value(profile.phoneNumber)}</Field>
          </Section>

          <Section title="Professional Information">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {doctor && (
                <>
                  <Field icon={Briefcase} label="Specialization" missing={!doctor.specialization}>{value(doctor.specialization)}</Field>
                  <Field icon={Activity} label="Experience" missing={years == null}>{years == null ? NOT_PROVIDED : `${years} ${years === 1 ? 'year' : 'years'}`}</Field>
                  <Field icon={FileText} label="License Number" missing={!doctor.licenseNumber}>{value(doctor.licenseNumber)}</Field>
                </>
              )}
              {technician && (
                <>
                  <Field icon={Briefcase} label="Technician Field" missing={!technician.technicianField}>{value(technician.technicianField)}</Field>
                  <Field icon={FileText} label="License Number" missing={!technician.licenseNumber}>{value(technician.licenseNumber)}</Field>
                  <Field icon={Wrench} label="Assigned Equipment" missing={!technician.assignedEquipment}>{value(technician.assignedEquipment)}</Field>
                </>
              )}
            </div>
            <div className="mt-4">
              {doctor && <DetailText label="Medical Qualifications" missing={value(doctor.qualification) === NOT_PROVIDED}>{value(doctor.qualification)}</DetailText>}
              {technician && <DetailText label="Certification" missing={value(technician.certification) === NOT_PROVIDED}>{value(technician.certification)}</DetailText>}
            </div>
          </Section>
        </div>
      )}
    </BaseModal>
  );
}
