import { useState, useEffect, useCallback, useRef } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Activity, type LucideIcon } from 'lucide-react';
import { profileAPI } from '../../services/api';
import { ApiError } from '../../services/httpClient';
import type { PatientProfile } from '../../types/user';
import { useAuth } from '../../hooks/useAuth';
import { isPositiveId } from '../../utils/clinicalValidation';
import { getAge } from '../../utils/profileValidation';
import { EmptyState } from '../EmptyState';
import { BUTTON_SECONDARY, DETAIL_LABEL, DETAIL_VALUE, MODAL_CLOSE, MODAL_OVERLAY, MODAL_PANEL, MODAL_TITLE } from '../dialogs/modalStyles';
import { DetailText } from '../dialogs/DetailItem';

function InfoCard({ icon: Icon, label, children, missing = false }: { icon: LucideIcon; label: string; children: React.ReactNode; missing?: boolean }) {
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

interface PatientProfileModalProps {
  patientId: number;
  onClose: () => void;
}

export function PatientProfileModal({ patientId, onClose }: PatientProfileModalProps) {
  const { sessionKey } = useAuth();
  const contextKey = `${sessionKey}:${patientId}`;
  const currentContextRef = useRef(contextKey);
  currentContextRef.current = contextKey;
  const requestRef = useRef(0);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatientProfile = useCallback(async () => {
    const requestId = ++requestRef.current;
    const isCurrent = () => requestId === requestRef.current && currentContextRef.current === contextKey;
    try {
      setLoading(true);
      setError(null);
      setProfile(null);
      if (!isPositiveId(patientId)) throw new Error('The selected patient could not be verified. Reopen the profile from the queue.');
      const data = await profileAPI.getPatient(patientId);
      if (!isCurrent()) return;
      if (data.user?.id !== patientId) throw new Error('The returned profile does not match the selected patient. Try again.');
      setProfile(data);
    } catch (err) {
      if (!isCurrent()) return;
      if (err instanceof ApiError && err.status === 404) {
        setProfile(null);
        setError('Patient has not completed their detailed profile yet.');
      } else {
        console.error('Failed to load patient profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patient profile');
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [patientId, contextKey]);

  useEffect(() => {
    currentContextRef.current = contextKey;
    void loadPatientProfile();
    return () => { requestRef.current += 1; currentContextRef.current = ''; };
  }, [loadPatientProfile, contextKey]);

  const age = getAge(profile?.dateOfBirth);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const text = (value?: string | null) => (value && value.trim() ? value : 'Not provided');

  return (
    <div className={`${MODAL_OVERLAY} z-50`} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="patient-profile-title" className={`${MODAL_PANEL} flex max-h-[90vh] max-w-3xl flex-col overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <h3 id="patient-profile-title" className={MODAL_TITLE}>Patient Profile</h3>
          <button type="button" onClick={onClose} aria-label="Close patient profile" className={MODAL_CLOSE}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {loading ? (
            <div role="status" className="flex flex-col items-center justify-center py-10">
              <div className="mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-[#38A3A5]"></div>
              <p className="text-sm text-gray-600">Loading patient profile...</p>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => void loadPatientProfile()} className="mt-2 text-sm font-medium text-red-800 underline">Try again</button>
            </div>
          ) : profile ? (
            <div className="space-y-5">
              <div className="rounded-lg bg-gradient-to-r from-[#38A3A5] to-[#2d8284] px-4 py-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
                    <User aria-hidden="true" className="h-6 w-6 text-[#38A3A5]" />
                  </div>
                  <h4 className="min-w-0 break-words text-xl font-bold">{profile.firstName} {profile.lastName}</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard icon={Calendar} label="Date of Birth" missing={age === undefined}>
                  {age === undefined ? 'Not provided' : profile.dateOfBirth.trim()}
                  {age !== undefined && <span className="ml-2 text-xs font-normal text-gray-600">({age} years old)</span>}
                </InfoCard>
                <InfoCard icon={User} label="Gender" missing={!profile.gender}>{text(profile.gender)}</InfoCard>
                {profile.bloodGroup && <InfoCard icon={Activity} label="Blood Group">{profile.bloodGroup}</InfoCard>}
                {profile.user?.email && <InfoCard icon={Mail} label="Email">{profile.user.email}</InfoCard>}
              </div>

              <section className="border-t border-gray-100 pt-5">
                <h4 className="mb-3 text-base font-semibold text-gray-900">Contact Information</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoCard icon={Phone} label="Phone Number" missing={!profile.phoneNumber}>{text(profile.phoneNumber)}</InfoCard>
                  <InfoCard icon={Phone} label="Emergency Contact" missing={!profile.emergencyContact}>{text(profile.emergencyContact)}</InfoCard>
                  <div className="sm:col-span-2">
                    <InfoCard icon={MapPin} label="Address" missing={!profile.address}>{text(profile.address)}</InfoCard>
                  </div>
                </div>
              </section>

              {(profile.allergies || profile.chronicDiseases) && (
                <section className="border-t border-gray-100 pt-5">
                  <h4 className="mb-3 text-base font-semibold text-gray-900">Medical Information</h4>
                  <div className="space-y-4">
                    {profile.allergies && <DetailText label="Allergies">{profile.allergies}</DetailText>}
                    {profile.chronicDiseases && <DetailText label="Chronic Conditions">{profile.chronicDiseases}</DetailText>}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <EmptyState icon={<User />} title="No profile data available" description="This patient's profile details are not available yet." headingLevel={4} />
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 px-5 py-3 sm:px-6">
          <button type="button" onClick={onClose} className={BUTTON_SECONDARY}>Close</button>
        </div>
      </div>
    </div>
  );
}
