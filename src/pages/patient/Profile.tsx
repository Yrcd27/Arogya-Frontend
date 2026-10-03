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

export function Profile() {
  const { user } = useAuth();
  const { profile: currentProfile, status: profileStatus, error: profileError, replaceProfile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [formData, setFormData] = useState({
    id: 0,
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    nicNumber: '',
    address: '',
    gender: 'Male',
    bloodGroup: 'O+',
    allergies: '',
    chronicDiseases: '',
    emergencyContact: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const savedFormData = useRef(formData);
  useUnsavedChangesWarning(isEditing && JSON.stringify(formData) !== JSON.stringify(savedFormData.current));

  useEffect(() => {
    const profile = currentProfile as PatientProfile | null;
    if (profile) {
        setFormData({
          id: profile.id,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          dateOfBirth: profile.dateOfBirth || '',
          phoneNumber: profile.phoneNumber || '',
          nicNumber: profile.nicNumber || '',
          address: profile.address || '',
          gender: profile.gender || 'Male',
          bloodGroup: profile.bloodGroup || 'O+',
          allergies: profile.allergies || '',
          chronicDiseases: profile.chronicDiseases || '',
          emergencyContact: profile.emergencyContact || '',
        });
        setHasProfile(true);
        setIsEditing(false);
      } else if (profileStatus === 'not-found') {
        setHasProfile(false);
        setIsEditing(false);
      } else if (profileStatus === 'error') {
        setError(profileError || 'Failed to load profile information');
      }
  }, [currentProfile, profileError, profileStatus]);

  const startEditing = () => {
    savedFormData.current = formData;
    setError('');
    setSuccess('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData(savedFormData.current);
    setError('');
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const savingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!user?.id) {
        setError('User information not found. Please login again.');
        return;
      }

      const profileData: CreatePatientProfileInput = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        phoneNumber: formData.phoneNumber,
        nicNumber: formData.nicNumber,
        address: formData.address,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        chronicDiseases: formData.chronicDiseases,
        emergencyContact: formData.emergencyContact,
        user: { id: user.id },
      };

      if (hasProfile) {
        const updated = await profileAPI.updatePatient({ ...profileData, id: formData.id });
        setFormData(prev => ({ ...prev, id: updated.id }));
        replaceProfile(updated);
        setSuccess('Profile updated successfully!');

      } else {
        const created = await profileAPI.createPatient(profileData);
        setFormData(prev => ({ ...prev, id: created.id }));
        replaceProfile(created);
        setSuccess('Profile created successfully!');
        setHasProfile(true);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Profile operation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {profileStatus === 'loading' ? <div className="py-24 text-center text-gray-500">Loading profile...</div> : <>
          <div className="mb-4 sm:mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / Profile</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Patient Profile
            </h1>
            <p className="text-gray-600 mt-2">
              {hasProfile ? 'Update your profile information' : 'Complete your profile to get started'}
            </p>
          </div>

          {!hasProfile && !isEditing && (
            <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 sm:px-6 sm:py-4">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Your profile isn't complete yet</p>
                <p className="text-sm text-amber-700">Select Complete Profile to add your details.</p>
              </div>
            </div>
          )}

          {success && (
            <div role="status" className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              <CheckCircleIcon className="h-5 w-5" />{success}
            </div>
          )}
          {error && !isEditing && (
            <div role="alert" className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircleIcon className="h-5 w-5" />{error}
            </div>
          )}

          {isEditing ? <div className="max-w-5xl bg-white rounded-xl shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Your first name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Your last name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Your phone number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NIC Number
                    </label>
                    <input
                      type="text"
                      name="nicNumber"
                      value={formData.nicNumber}
                      onChange={handleInputChange}
                      placeholder="National Identity Card number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Blood Group
                      </label>
                      <select
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Allergies
                      </label>
                      <input
                        type="text"
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleInputChange}
                        placeholder="Any known allergies"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Chronic Diseases
                      </label>
                      <input
                        type="text"
                        name="chronicDiseases"
                        value={formData.chronicDiseases}
                        onChange={handleInputChange}
                        placeholder="Any chronic diseases"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter your address"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        placeholder="Emergency contact number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
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
        </main>
      </div>
    </div>
  );
}
