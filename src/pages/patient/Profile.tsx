import { Select } from '../../components/Select';
import { DatePicker } from '../../components/DatePicker';
import { PageContent } from '../../components/PageContent';
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircleIcon, CheckCircleIcon, SaveIcon, XIcon } from 'lucide-react';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { CreatePatientProfileInput, PatientProfile } from '../../types/user';
import { Header } from '../../components/patient/Header';
import { Sidebar } from '../../components/patient/Sidebar';
import { ProfileView } from '../../components/profile/ProfileView';
import { focusFirstInvalidField, getApiFieldErrors, type FieldErrors } from '../../utils/formValidation';
import { MIN_BIRTH_DATE, PROFILE_FIELDS, PROFILE_MAX_LENGTH, PROFILE_OPTIONS, getProfileFieldError, localDateString, normalizeProfile, normalizeProfileField, validateProfile, type ProfileField } from '../../utils/profileValidation';

type PatientField = (typeof PROFILE_FIELDS.patient)[number];
const emptyPatientProfile = {
  id: 0, firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', nicNumber: '', address: '',
  gender: '', bloodGroup: '', allergies: '', chronicDiseases: '', emergencyContact: '',
};

export function Profile() {
  const { user } = useAuth();
  const { profile: currentProfile, status: profileStatus, error: profileError, replaceProfile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  const [formData, setFormData] = useState(emptyPatientProfile);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});
  const savedFormData = useRef(formData);
  const currentUserIdRef = useRef(user?.id);
  currentUserIdRef.current = user?.id;
  const confirmDiscard = useUnsavedChangesWarning(isEditing && JSON.stringify(formData) !== JSON.stringify(savedFormData.current));

  useEffect(() => {
    const profile = currentProfile as PatientProfile | null;
    if (profile) {
        const nextProfile = {
          id: profile.id,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          dateOfBirth: profile.dateOfBirth || '',
          phoneNumber: profile.phoneNumber || '',
          nicNumber: profile.nicNumber || '',
          address: profile.address || '',
          gender: profile.gender || '',
          bloodGroup: profile.bloodGroup || '',
          allergies: profile.allergies || '',
          chronicDiseases: profile.chronicDiseases || '',
          emergencyContact: profile.emergencyContact || '',
        };
        setFormData(nextProfile);
        savedFormData.current = nextProfile;
        setFieldErrors({});
        setHasProfile(true);
        setIsEditing(false);
      } else if (profileStatus === 'not-found') {
        setFormData(emptyPatientProfile);
        savedFormData.current = emptyPatientProfile;
        setFieldErrors({});
        setHasProfile(false);
        setIsEditing(false);
      } else if (profileStatus === 'error') {
        setError(profileError || 'Failed to load profile information');
      }
  }, [currentProfile, profileError, profileStatus]);

  const startEditing = () => {
    if (profileStatus !== 'ready' && profileStatus !== 'not-found') return;
    savedFormData.current = formData;
    setError('');
    setSuccess('');
    setFieldErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (savingRef.current) return;
    confirmDiscard(() => {
      setFormData(savedFormData.current);
      setError('');
      setFieldErrors({});
      setIsEditing(false);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (savingRef.current) return;
    const { name, value } = e.target;
    const field = name as PatientField;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setFieldErrors(previous => ({ ...previous, [field]: previous[field] ? getProfileFieldError('patient', field, value, savedFormData.current[field]) : undefined }));
  };

  const fieldProps = (field: PatientField) => ({
    id: `patient-${field}`,
    maxLength: PROFILE_MAX_LENGTH[field],
    disabled: loading,
    'aria-invalid': !!fieldErrors[field],
    'aria-describedby': fieldErrors[field] ? `patient-${field}-error` : undefined,
    onBlur: () => {
      if (savingRef.current) return;
      const value = normalizeProfileField(field, formData[field]);
      setFormData(previous => ({ ...previous, [field]: value }));
      setFieldErrors(previous => ({ ...previous, [field]: getProfileFieldError('patient', field, value, savedFormData.current[field]) ?? previous[field] }));
    },
  });

  const fieldError = (field: PatientField) => fieldErrors[field]
    ? <p id={`patient-${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors[field]}</p> : null;

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
    const errors = validateProfile('patient', formData, savedFormData.current);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstInvalidField(form);
      return;
    }
    if (hasProfile && (!Number.isInteger(formData.id) || formData.id <= 0)) {
      setError('Profile ID is missing. Please reload the page and try again.');
      return;
    }
    const submittedUserId = user.id;
    const normalized = normalizeProfile('patient', formData);
    savingRef.current = true;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const profileData: CreatePatientProfileInput = {
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        dateOfBirth: normalized.dateOfBirth,
        phoneNumber: normalized.phoneNumber,
        nicNumber: normalized.nicNumber,
        address: normalized.address,
        gender: normalized.gender,
        bloodGroup: normalized.bloodGroup,
        allergies: normalized.allergies,
        chronicDiseases: normalized.chronicDiseases,
        emergencyContact: normalized.emergencyContact,
        user: { id: submittedUserId },
      };

      if (hasProfile) {
        const updated = await profileAPI.updatePatient({ ...profileData, id: formData.id });
        if (currentUserIdRef.current !== submittedUserId) return;
        setFormData({ ...normalized, id: updated.id });
        savedFormData.current = { ...normalized, id: updated.id };
        replaceProfile(updated);
        setSuccess('Profile updated successfully!');

      } else {
        const created = await profileAPI.createPatient(profileData);
        if (currentUserIdRef.current !== submittedUserId) return;
        setFormData({ ...normalized, id: created.id });
        savedFormData.current = { ...normalized, id: created.id };
        replaceProfile(created);
        setSuccess('Profile created successfully!');
        setHasProfile(true);
      }
      setIsEditing(false);
    } catch (error) {
      if (currentUserIdRef.current !== submittedUserId) return;
      const errors = getApiFieldErrors(error, PROFILE_FIELDS.patient);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        focusFirstInvalidField(form);
      } else setError(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <PageContent>
          {profileStatus === 'loading' ? <div className="py-24 text-center text-gray-500">Loading profile...</div> : <>
          <div>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Profile</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Patient Profile
            </h1>
            <p className="text-gray-600 mt-1">
              {hasProfile ? 'Update your profile information' : 'Complete your profile to get started'}
            </p>
          </div>

          {!hasProfile && !isEditing && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 sm:px-6 sm:py-4">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Your profile isn't complete yet</p>
                <p className="text-sm text-amber-700">Select Complete Profile to add your details.</p>
              </div>
            </div>
          )}

          {success && (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircleIcon className="h-5 w-5" />{success}
            </div>
          )}
          {error && !isEditing && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircleIcon className="h-5 w-5" />{error}
            </div>
          )}

          {isEditing ? <div className="w-full bg-white rounded-xl shadow-sm p-6">
            <form onSubmit={handleSubmit} noValidate aria-busy={loading} className="space-y-6">
                {/* Success/Error Messages */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">{success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="patient-firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input {...fieldProps('firstName')}
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Your first name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        required
                        disabled={loading}
                      />
                      {fieldError('firstName')}
                    </div>
                    <div>
                      <label htmlFor="patient-lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input {...fieldProps('lastName')}
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Your last name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        required
                        disabled={loading}
                      />
                      {fieldError('lastName')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label htmlFor="patient-dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <DatePicker {...fieldProps('dateOfBirth')} min={MIN_BIRTH_DATE} max={localDateString()}
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        showToday={false}
                        disabled={loading}
                      />
                      {fieldError('dateOfBirth')}
                    </div>
                    <div>
                      <label htmlFor="patient-phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input {...fieldProps('phoneNumber')} inputMode="tel" autoComplete="tel"
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Your phone number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                      {fieldError('phoneNumber')}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label htmlFor="patient-nicNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      NIC Number
                    </label>
                    <input {...fieldProps('nicNumber')} autoCapitalize="characters" spellCheck={false}
                      type="text"
                      name="nicNumber"
                      value={formData.nicNumber}
                      onChange={handleInputChange}
                      placeholder="National Identity Card number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      disabled={loading}
                    />
                    {fieldError('nicNumber')}
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="patient-gender" className="block text-sm font-medium text-gray-900 mb-2">
                        Gender
                      </label>
                      <Select {...fieldProps('gender')}
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      >
                        <option value="">Not specified</option>
                        {formData.gender && !PROFILE_OPTIONS.gender.some(option => option === formData.gender) && <option value={formData.gender}>{formData.gender} (current value)</option>}
                        {PROFILE_OPTIONS.gender.map(option => <option key={option} value={option}>{option}</option>)}
                      </Select>
                      {fieldError('gender')}
                    </div>
                    <div>
                      <label htmlFor="patient-bloodGroup" className="block text-sm font-medium text-gray-900 mb-2">
                        Blood Group
                      </label>
                      <Select {...fieldProps('bloodGroup')}
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      >
                        <option value="">Not specified</option>
                        {formData.bloodGroup && !PROFILE_OPTIONS.bloodGroup.some(option => option === formData.bloodGroup) && <option value={formData.bloodGroup}>{formData.bloodGroup} (current value)</option>}
                        {PROFILE_OPTIONS.bloodGroup.map(option => <option key={option} value={option}>{option}</option>)}
                      </Select>
                      {fieldError('bloodGroup')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label htmlFor="patient-allergies" className="block text-sm font-medium text-gray-900 mb-2">
                        Allergies
                      </label>
                      <input {...fieldProps('allergies')}
                        type="text"
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleInputChange}
                        placeholder="Any known allergies"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                      {fieldError('allergies')}
                    </div>
                    <div>
                      <label htmlFor="patient-chronicDiseases" className="block text-sm font-medium text-gray-900 mb-2">
                        Chronic Diseases
                      </label>
                      <input {...fieldProps('chronicDiseases')}
                        type="text"
                        name="chronicDiseases"
                        value={formData.chronicDiseases}
                        onChange={handleInputChange}
                        placeholder="Any chronic diseases"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                      {fieldError('chronicDiseases')}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label htmlFor="patient-address" className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea {...fieldProps('address')}
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter your address"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                      {fieldError('address')}
                    </div>
                    <div>
                      <label htmlFor="patient-emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact
                      </label>
                      <input {...fieldProps('emergencyContact')} inputMode="tel" autoComplete="off"
                        type="tel"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        placeholder="Emergency contact number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                      {fieldError('emergencyContact')}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col-reverse gap-3 pt-6 border-t border-gray-200 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <XIcon className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors disabled:opacity-50"
                  >
                    <SaveIcon className="h-4 w-4" />
                    {loading ? 'Saving...' : (hasProfile ? 'Save Changes' : 'Create Profile')}
                  </button>
                </div>
              </form>
            </div> : <ProfileView
              role="Patient"
              name={`${formData.firstName} ${formData.lastName}`.trim()}
              incomplete={!hasProfile}
              onEdit={startEditing}
              sections={[
                { title: 'Personal information', details: [{ label: 'First name', value: formData.firstName }, { label: 'Last name', value: formData.lastName }, { label: 'Date of birth', value: formData.dateOfBirth }, { label: 'NIC number', value: formData.nicNumber }, { label: 'Gender', value: hasProfile ? formData.gender : '' }] },
                { title: 'Medical information', details: [{ label: 'Blood group', value: hasProfile ? formData.bloodGroup : '' }, { label: 'Allergies', value: formData.allergies }, { label: 'Chronic diseases', value: formData.chronicDiseases }] },
                { title: 'Contact information', details: [{ label: 'Phone number', value: formData.phoneNumber }, { label: 'Address', value: formData.address }, { label: 'Emergency contact', value: formData.emergencyContact }] },
              ]}
            />}
          </>}
        </PageContent>
      </div>
    </div>
  );
}
