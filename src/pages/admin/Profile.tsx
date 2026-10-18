import { PageContent } from '../../components/PageContent';
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircleIcon, CheckCircleIcon, SaveIcon, XIcon } from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { Sidebar } from '../../components/admin/Sidebar';
import { ProfileView } from '../../components/profile/ProfileView';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { AdminProfile as StoredAdminProfile, CreateAdminProfileInput } from '../../types/user';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { MIN_BIRTH_DATE, PROFILE_FIELDS, PROFILE_MAX_LENGTH, getProfileFieldError, localDateString, normalizeProfile, normalizeProfileField, validateProfile, type ProfileField } from '../../utils/profileValidation';

type AdminField = (typeof PROFILE_FIELDS.admin)[number];

interface AdminProfile { id?: number; firstName: string; lastName: string; dateOfBirth: string; phoneNumber: string; nicNumber: string; user: { id: number }; }

const emptyProfile: AdminProfile = { firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', nicNumber: '', user: { id: 0 } };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-[#38A3A5]';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { profile: currentProfile, status: profileStatus, error: profileError, replaceProfile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [profile, setProfile] = useState<AdminProfile>(emptyProfile);
  const savedProfile = useRef<AdminProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});
  const savingRef = useRef(false);
  const currentUserIdRef = useRef(user?.id);
  currentUserIdRef.current = user?.id;
  const confirmDiscard = useUnsavedChangesWarning(isEditing && JSON.stringify(profile) !== JSON.stringify(savedProfile.current));

  useEffect(() => {
    if (currentProfile) {
      const nextProfile = currentProfile as StoredAdminProfile;
      setProfile(nextProfile);
      savedProfile.current = nextProfile;
      setIsNewProfile(false);
      setIsEditing(false);
    } else if (profileStatus === 'not-found' && user?.id) {
      const nextProfile = { ...emptyProfile, user: { id: user.id } };
      setProfile(nextProfile);
      savedProfile.current = nextProfile;
      setIsNewProfile(true);
      setIsEditing(false);
    } else if (profileStatus === 'error') setError(profileError || 'Failed to load profile information');
  }, [currentProfile, profileError, profileStatus, user?.id]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (savingRef.current) return;
    const { name, value } = event.target;
    const field = name as AdminField;
    setProfile(previous => ({ ...previous, [name]: value }));
    setError('');
    setFieldErrors(previous => ({ ...previous, [field]: previous[field] ? getProfileFieldError('admin', field, value, savedProfile.current[field]) : undefined }));
  };
  const startEditing = () => {
    if (profileStatus !== 'ready' && profileStatus !== 'not-found') return;
    savedProfile.current = profile; setError(''); setSuccess(''); setFieldErrors({}); setIsEditing(true);
  };
  const cancelEditing = () => {
    if (savingRef.current) return;
    confirmDiscard(() => {
      setProfile(savedProfile.current); setError(''); setFieldErrors({}); setIsEditing(false);
    });
  };

  const fieldProps = (field: AdminField) => ({
    id: `admin-${field}`,
    maxLength: PROFILE_MAX_LENGTH[field],
    disabled: saving,
    'aria-invalid': !!fieldErrors[field],
    'aria-describedby': fieldErrors[field] ? `admin-${field}-error` : undefined,
    onBlur: () => {
      if (savingRef.current) return;
      const value = normalizeProfileField(field, profile[field]);
      setProfile(previous => ({ ...previous, [field]: value }));
      setFieldErrors(previous => ({ ...previous, [field]: getProfileFieldError('admin', field, value, savedProfile.current[field]) ?? previous[field] }));
    },
  });

  const fieldError = (field: AdminField) => fieldErrors[field]
    ? <p id={`admin-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors[field]}</p> : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    const form = event.currentTarget as HTMLFormElement;
    setError('');
    setSuccess('');
    if (!user?.id || !Number.isInteger(user.id) || user.id <= 0) {
      setError('User information not found. Please login again.');
      return;
    }
    if (profileStatus !== 'ready' && profileStatus !== 'not-found') {
      setError('Your profile could not be loaded. Please reload the page before saving.');
      return;
    }
    const errors = validateProfile('admin', profile, savedProfile.current);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstInvalidField(form);
      return;
    }
    if (!isNewProfile && (profile.id === undefined || !Number.isInteger(profile.id) || profile.id <= 0)) {
      setError('Profile ID is missing. Please reload the page and try again.');
      return;
    }
    const submittedUserId = user.id;
    const normalized = normalizeProfile('admin', profile);
    const requestBody: CreateAdminProfileInput = { firstName: normalized.firstName, lastName: normalized.lastName, dateOfBirth: normalized.dateOfBirth, phoneNumber: normalized.phoneNumber, nicNumber: normalized.nicNumber, user: { id: submittedUserId } };
    savingRef.current = true;
    setSaving(true);
    try {
      if (isNewProfile) {
        const created = await profileAPI.createAdmin(requestBody);
        if (currentUserIdRef.current !== submittedUserId) return;
        const nextProfile = { ...normalized, id: created.id };
        setProfile(nextProfile); savedProfile.current = nextProfile; replaceProfile(created); setSuccess('Profile created successfully!'); setIsNewProfile(false);
      } else {
        if (profile.id === undefined) throw new Error('Profile ID is missing. Please reload the page and try again.');
        const updated = await profileAPI.updateAdmin({ ...requestBody, id: profile.id });
        if (currentUserIdRef.current !== submittedUserId) return;
        const nextProfile = { ...normalized, id: updated.id };
        setProfile(nextProfile); savedProfile.current = nextProfile; replaceProfile(updated); setSuccess('Profile updated successfully!');
      }
      setIsEditing(false);
    } catch (saveError: unknown) {
      if (currentUserIdRef.current !== submittedUserId) return;
      const errors = getApiFieldErrors(saveError, PROFILE_FIELDS.admin);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        focusFirstInvalidField(form);
      } else setError(saveError instanceof Error ? saveError.message : 'Failed to save profile');
    } finally { savingRef.current = false; setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent>
          {profileStatus === 'loading' ? <div className="py-24 text-center text-gray-500">Loading profile...</div> : <>
            <div>
              <p className="mb-1 text-sm text-gray-600">Dashboard / Profile</p>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{isNewProfile ? 'Complete Your Admin Profile' : 'Admin Profile'}</h1>
            </div>
            {isNewProfile && !isEditing && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />Your profile is not complete yet. Select Complete Profile to add your details.
              </div>
            )}
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircleIcon className="h-5 w-5" />{error}
              </div>
            )}
            {success && (
              <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
                <CheckCircleIcon className="h-5 w-5" />{success}
              </div>
            )}
            {isEditing ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-7">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{isNewProfile ? 'Complete profile' : 'Edit profile'}</h2>
                  <p className="mt-1 text-sm text-gray-600">Update your personal and contact information.</p>
                </div>
                <form onSubmit={handleSubmit} noValidate aria-busy={saving} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {([
                      ['First Name', 'firstName', 'Enter first name'],
                      ['Last Name', 'lastName', 'Enter last name'],
                      ['Date of Birth', 'dateOfBirth', ''],
                      ['Phone Number', 'phoneNumber', '+94771234567'],
                      ['NIC Number', 'nicNumber', '123456789V or 123456789012'],
                    ] as const).map(([label, name, placeholder]) => (
                      <div key={name}>
                        <label htmlFor={`admin-${name}`} className="mb-2 block text-sm font-medium text-gray-700">{label} *</label>
                        <input
                          {...fieldProps(name)}
                          type={name === 'dateOfBirth' ? 'date' : name === 'phoneNumber' ? 'tel' : 'text'}
                          name={name}
                          value={profile[name]}
                          onChange={handleInputChange}
                          required
                          min={name === 'dateOfBirth' ? MIN_BIRTH_DATE : undefined}
                          max={name === 'dateOfBirth' ? localDateString() : undefined}
                          inputMode={name === 'phoneNumber' ? 'tel' : undefined}
                          autoComplete={name === 'phoneNumber' ? 'tel' : undefined}
                          autoCapitalize={name === 'nicNumber' ? 'characters' : undefined}
                          spellCheck={name === 'nicNumber' ? false : undefined}
                          placeholder={placeholder}
                          className={inputClass}
                        />
                        {fieldError(name)}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
                    <button type="button" onClick={cancelEditing} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      <XIcon className="h-4 w-4" />Cancel
                    </button>
                    <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#38A3A5] px-5 py-2.5 font-medium text-white hover:bg-[#2d8284] disabled:opacity-50">
                      <SaveIcon className="h-4 w-4" />{saving ? 'Saving...' : isNewProfile ? 'Create Profile' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </section>
            ) : <ProfileView
              role="Administrator"
              name={`${profile.firstName} ${profile.lastName}`.trim()}
              incomplete={isNewProfile}
              onEdit={startEditing}
              sections={[
                { title: 'Personal information', details: [{ label: 'First name', value: profile.firstName }, { label: 'Last name', value: profile.lastName }, { label: 'Date of birth', value: profile.dateOfBirth }, { label: 'NIC number', value: profile.nicNumber }] },
                { title: 'Contact information', details: [{ label: 'Phone number', value: profile.phoneNumber }] },
              ]}
            />}
          </>}
        </PageContent>
      </div>
    </div>
  );
};

export default Profile;
