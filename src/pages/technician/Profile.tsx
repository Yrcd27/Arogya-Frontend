import { Select } from '../../components/Select';
import { PageContent } from '../../components/PageContent';
import React, { useState, useEffect, useRef } from 'react';
import { SaveIcon, AlertCircleIcon, CheckCircleIcon, XIcon } from 'lucide-react';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { ProfileView } from '../../components/profile/ProfileView';
import type { CreateTechnicianProfileInput, TechnicianProfile as StoredTechnicianProfile } from '../../types/user';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { MIN_BIRTH_DATE, PROFILE_FIELDS, PROFILE_MAX_LENGTH, PROFILE_OPTIONS, getProfileFieldError, localDateString, normalizeProfile, normalizeProfileField, validateProfile, type ProfileField } from '../../utils/profileValidation';

type TechnicianField = (typeof PROFILE_FIELDS.technician)[number];

interface TechnicianProfile {
  id?: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  nicNumber: string;
  technicianField: string;
  licenseNumber: string;
  certification: string;
  assignedEquipment: string;
  user: {
    id: number;
  };
}

function createEmptyProfile(userId: number): TechnicianProfile {
  return {
    firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', nicNumber: '',
    technicianField: '', licenseNumber: '', certification: '', assignedEquipment: '',
    user: { id: userId }
  };
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { profile: currentProfile, status: profileStatus, error: profileError, replaceProfile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [profile, setProfile] = useState<TechnicianProfile>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    nicNumber: '',
    technicianField: '',
    licenseNumber: '',
    certification: '',
    assignedEquipment: '',
    user: {
      id: 0
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});
  const savedProfile = useRef<TechnicianProfile | null>(null);
  const currentUserIdRef = useRef(user?.id);
  currentUserIdRef.current = user?.id;
  useUnsavedChangesWarning(isEditing && JSON.stringify(profile) !== JSON.stringify(savedProfile.current));
  const loading = profileStatus === 'loading';

  useEffect(() => {
    const storedProfile = currentProfile as StoredTechnicianProfile | null;
    if (storedProfile) {
      setProfile({
        id: storedProfile.id,
        firstName: storedProfile.firstName || '',
        lastName: storedProfile.lastName || '',
        dateOfBirth: storedProfile.dateOfBirth || '',
        phoneNumber: storedProfile.phoneNumber || '',
        nicNumber: storedProfile.nicNumber || '',
        technicianField: storedProfile.technicianField || '',
        licenseNumber: storedProfile.licenseNumber || '',
        certification: storedProfile.certification || '',
        assignedEquipment: storedProfile.assignedEquipment || '',
        user: { id: storedProfile.user?.id ?? user?.id ?? 0 },
      });
      setIsNewProfile(false);
      savedProfile.current = {
        id: storedProfile.id, firstName: storedProfile.firstName || '', lastName: storedProfile.lastName || '', dateOfBirth: storedProfile.dateOfBirth || '', phoneNumber: storedProfile.phoneNumber || '', nicNumber: storedProfile.nicNumber || '', technicianField: storedProfile.technicianField || '', licenseNumber: storedProfile.licenseNumber || '', certification: storedProfile.certification || '', assignedEquipment: storedProfile.assignedEquipment || '', user: { id: storedProfile.user?.id ?? user?.id ?? 0 },
      };
      setIsEditing(false);
    } else if (profileStatus === 'not-found' && user?.id) {
      const nextProfile = createEmptyProfile(user.id);
      setProfile(nextProfile);
      savedProfile.current = nextProfile;
      setIsNewProfile(true);
      setIsEditing(false);
    } else if (profileStatus === 'error') {
      setError(profileError || 'Failed to load profile information');
    }
  }, [currentProfile, profileError, profileStatus, user?.id]);

  const startEditing = () => {
    if (profileStatus !== 'ready' && profileStatus !== 'not-found') return;
    savedProfile.current = profile;
    setError('');
    setSuccess('');
    setFieldErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (savingRef.current) return;
    if (savedProfile.current) setProfile(savedProfile.current);
    setError('');
    setFieldErrors({});
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (savingRef.current) return;
    const { name, value } = e.target;
    const field = name as TechnicianField;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setFieldErrors(previous => ({ ...previous, [field]: previous[field] ? getProfileFieldError('technician', field, value, savedProfile.current?.[field]) : undefined }));
  };

  const fieldProps = (field: TechnicianField) => ({
    id: `technician-${field}`,
    maxLength: PROFILE_MAX_LENGTH[field],
    disabled: saving,
    'aria-invalid': !!fieldErrors[field],
    'aria-describedby': fieldErrors[field] ? `technician-${field}-error` : undefined,
    onBlur: () => {
      if (savingRef.current) return;
      const value = normalizeProfileField(field, profile[field]);
      setProfile(previous => ({ ...previous, [field]: value }));
      setFieldErrors(previous => ({ ...previous, [field]: getProfileFieldError('technician', field, value, savedProfile.current?.[field]) ?? previous[field] }));
    },
  });

  const fieldError = (field: TechnicianField) => fieldErrors[field]
    ? <p id={`technician-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors[field]}</p> : null;

  const savingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
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
    const errors = validateProfile('technician', profile, savedProfile.current ?? {});
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
    const normalized = normalizeProfile('technician', profile);
    savingRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');

    const requestBody: CreateTechnicianProfileInput = {
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      dateOfBirth: normalized.dateOfBirth,
      phoneNumber: normalized.phoneNumber,
      nicNumber: normalized.nicNumber,
      technicianField: normalized.technicianField,
      licenseNumber: normalized.licenseNumber,
      certification: normalized.certification,
      assignedEquipment: normalized.assignedEquipment,
      user: { id: submittedUserId },
    };

    try {
      if (isNewProfile) {
        const created = await profileAPI.createTechnician(requestBody);
        if (currentUserIdRef.current !== submittedUserId) return;
        setProfile({ ...normalized, id: created.id });
        savedProfile.current = { ...normalized, id: created.id };
        replaceProfile(created);
        setSuccess('Profile created successfully!');
        setIsNewProfile(false);
      } else {
        if (profile.id === undefined) throw new Error('Profile ID is missing. Please reload the page and try again.');
        const updated = await profileAPI.updateTechnician({ ...requestBody, id: profile.id });
        if (currentUserIdRef.current !== submittedUserId) return;
        setProfile({ ...normalized, id: updated.id });
        savedProfile.current = { ...normalized, id: updated.id };
        replaceProfile(updated);
        setSuccess('Profile updated successfully!');
      }
      setIsEditing(false);
    } catch (error: unknown) {
      if (currentUserIdRef.current !== submittedUserId) return;
      const errors = getApiFieldErrors(error, PROFILE_FIELDS.technician);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        focusFirstInvalidField(form);
      } else setError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <PageContent>
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading profile...</div>
            </div>
          </PageContent>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <PageContent scrollable>
          <div>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Profile</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isNewProfile ? 'Complete Your Technician Profile' : 'Technician Profile'}
            </h1>
          </div>

          {isNewProfile && !isEditing && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 sm:px-6 sm:py-4">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Your profile isn't complete yet</p>
                <p className="text-sm text-amber-700">Fill in the details below to get the most out of Arogya.</p>
              </div>
            </div>
          )}

          {error && !isEditing && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircleIcon className="h-5 w-5" />{error}
            </div>
          )}

          {success && !isEditing && (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircleIcon className="h-5 w-5" />{success}
            </div>
          )}

          {isEditing ? <div className="max-w-5xl bg-white rounded-xl shadow-sm p-6">
            {error && (
              <div role="alert" className="mb-6 flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-700">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-busy={saving} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label htmlFor="technician-firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input {...fieldProps('firstName')}
                    type="text"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter first name"
                  />
                  {fieldError('firstName')}
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="technician-lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input {...fieldProps('lastName')}
                    type="text"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter last name"
                  />
                  {fieldError('lastName')}
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="technician-dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input {...fieldProps('dateOfBirth')} min={MIN_BIRTH_DATE} max={localDateString()}
                    type="date"
                    name="dateOfBirth"
                    value={profile.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  />
                  {fieldError('dateOfBirth')}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="technician-phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input {...fieldProps('phoneNumber')} inputMode="tel" autoComplete="tel"
                    type="tel"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="+94771234567"
                  />
                  {fieldError('phoneNumber')}
                </div>

                {/* NIC Number */}
                <div>
                  <label htmlFor="technician-nicNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    NIC Number *
                  </label>
                  <input {...fieldProps('nicNumber')} autoCapitalize="characters" spellCheck={false}
                    type="text"
                    name="nicNumber"
                    value={profile.nicNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="123456789V or 123456789012"
                  />
                  {fieldError('nicNumber')}
                </div>

                {/* Technician Field */}
                <div>
                  <label htmlFor="technician-technicianField" className="block text-sm font-medium text-gray-700 mb-2">
                    Technician Field *
                  </label>
                  <Select {...fieldProps('technicianField')}
                    name="technicianField"
                    value={profile.technicianField}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  >
                    <option value="">Select technician field</option>
                    {profile.technicianField && !PROFILE_OPTIONS.technicianField.some(option => option === profile.technicianField) && <option value={profile.technicianField}>{profile.technicianField} (current value)</option>}
                    {PROFILE_OPTIONS.technicianField.map(option => <option key={option} value={option}>{option}</option>)}
                  </Select>
                  {fieldError('technicianField')}
                </div>

                {/* License Number */}
                <div>
                  <label htmlFor="technician-licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    License Number *
                  </label>
                  <input {...fieldProps('licenseNumber')}
                    type="text"
                    name="licenseNumber"
                    value={profile.licenseNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter license number"
                  />
                  {fieldError('licenseNumber')}
                </div>
              </div>

              {/* Certification */}
              <div>
                <label htmlFor="technician-certification" className="block text-sm font-medium text-gray-700 mb-2">
                  Certification *
                </label>
                <textarea {...fieldProps('certification')}
                  name="certification"
                  value={profile.certification}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="Enter your certifications and qualifications"
                />
                {fieldError('certification')}
              </div>

              {/* Assigned Equipment */}
              <div>
                <label htmlFor="technician-assignedEquipment" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Equipment *
                </label>
                <textarea {...fieldProps('assignedEquipment')}
                  name="assignedEquipment"
                  value={profile.assignedEquipment}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="List equipment and instruments assigned to you"
                />
                {fieldError('assignedEquipment')}
              </div>

              <div className="flex flex-col-reverse gap-3 pt-6 border-t border-gray-200 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <XIcon className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors disabled:opacity-50"
                >
                  <SaveIcon className="h-4 w-4" />
                  {saving ? 'Saving...' : isNewProfile ? 'Create Profile' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div> : <ProfileView
            role="Technician"
            name={`${profile.firstName} ${profile.lastName}`.trim()}
            incomplete={isNewProfile}
            onEdit={startEditing}
            sections={[
              { title: 'Personal information', details: [{ label: 'First name', value: profile.firstName }, { label: 'Last name', value: profile.lastName }, { label: 'Date of birth', value: profile.dateOfBirth }, { label: 'NIC number', value: profile.nicNumber }] },
              { title: 'Professional information', details: [{ label: 'Technician field', value: profile.technicianField }, { label: 'License number', value: profile.licenseNumber }, { label: 'Certification', value: profile.certification }, { label: 'Assigned equipment', value: profile.assignedEquipment }] },
              { title: 'Contact information', details: [{ label: 'Phone number', value: profile.phoneNumber }] },
            ]}
          />}
        </PageContent>
      </div>
    </div>
  );
};

export default Profile;
