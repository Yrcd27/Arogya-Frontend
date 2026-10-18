import type { ReactNode } from 'react';
import { Activity, Briefcase, Calendar, CreditCard, FileText, Mail, Phone, User, Wrench, type LucideIcon } from 'lucide-react';
import { BaseModal } from '../dialogs/BaseModal';
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
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#38A3A5]" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`break-words ${missing ? 'text-gray-400' : 'text-gray-900'}`}>{children}</p>
      </div>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  const missing = text === NOT_PROVIDED;
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 whitespace-pre-wrap break-words rounded-lg border p-3 ${missing ? 'border-gray-200 bg-gray-50 text-gray-400' : 'border-[#bde6e7] bg-[#f3fbfb] text-gray-800'}`}>{text}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t pt-4">
      <h4 className="mb-3 text-lg font-semibold text-gray-900">{title}</h4>
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
    <BaseModal isOpen={profile !== null} title={kind === 'doctor' ? 'Doctor Profile' : 'Technician Profile'} size="lg" onClose={onClose}>
      {profile && (
        <div className="space-y-6">
          <div className="rounded-lg bg-gradient-to-r from-[#38A3A5] to-[#2d8284] p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white">
                <User aria-hidden="true" className="h-8 w-8 text-[#38A3A5]" />
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-2xl font-bold">{displayName(profile, kind)}</h3>
                {specialityText && <p className="mt-1 break-words text-white/90">{specialityText}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              {doctor && <TextBlock label="Medical Qualifications" text={value(doctor.qualification)} />}
              {technician && <TextBlock label="Certification" text={value(technician.certification)} />}
            </div>
          </Section>
        </div>
      )}
    </BaseModal>
  );
}
