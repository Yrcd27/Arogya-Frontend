import { Link } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../hooks/useAuth';
import { getAge } from '../../utils/profileValidation';
import type { PatientProfile } from '../../types/user';
import { DashboardPanel } from '../dashboard/DashboardWidgets';

export function PatientCard() {
  const { user } = useAuth();
  const { profile: currentProfile, status, error, refetchProfile, getUserInitials } = useUserProfile();
  const profile = currentProfile?.user?.id === user?.id ? currentProfile as PatientProfile | null : null;
  const identityError = status === 'ready' && currentProfile && !profile ? 'Your health summary could not be verified for this account.' : null;
  const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || user?.username : '';
  const fields = [
    ['Age', getAge(profile?.dateOfBirth)?.toString() || 'Not provided'],
    ['Blood group', profile?.bloodGroup?.trim() || 'Not provided'],
    ['Allergies', profile?.allergies?.trim() || 'Not provided'],
    ['Chronic conditions', profile?.chronicDiseases?.trim() || 'Not provided'],
  ];

  return (
    <DashboardPanel title="Health summary" description="Information saved in your patient profile." loading={status === 'loading'} error={status === 'error' ? error || 'Your profile could not be loaded.' : identityError} onRetry={() => void refetchProfile()} action={profile ? { to: '/patient/profile', label: 'Update health information' } : undefined}>
      {!profile ? <div className="py-2"><p className="text-sm text-gray-600">Complete your profile to keep your personal and medical information available.</p><Link to="/patient/profile" className="mt-3 inline-flex rounded-lg bg-[#38A3A5] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d8284]">Complete profile</Link></div>
        : <><div className="mb-4 flex min-w-0 items-center gap-3"><div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#38A3A5]/10 text-base font-semibold text-[#2d8284]">{getUserInitials()}</div><p className="min-w-0 break-words font-semibold text-gray-900">{name}</p></div><dl className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 whitespace-pre-line break-words text-sm text-gray-900">{value}</dd></div>)}</dl></>}
    </DashboardPanel>
  );
}
