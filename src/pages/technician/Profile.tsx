import React, { useState, useEffect, useRef } from 'react';
import { SaveIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { CreateTechnicianProfileInput, TechnicianProfile as StoredTechnicianProfile } from '../../types/user';

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

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { profile: currentProfile, status: profileStatus, error: profileError, replaceProfile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
        user: { id: storedProfile.user.id },
      });
      setIsNewProfile(false);
    } else if (profileStatus === 'not-found' && user?.id) {
      setProfile(prev => ({ ...prev, user: { id: user.id } }));
      setIsNewProfile(true);
    } else if (profileStatus === 'error') {
      setError(profileError || 'Failed to load profile information');
    }
  }, [currentProfile, profileError, profileStatus, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const savingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');

    const requestBody: CreateTechnicianProfileInput = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
      phoneNumber: profile.phoneNumber,
      nicNumber: profile.nicNumber,
      technicianField: profile.technicianField,
      licenseNumber: profile.licenseNumber,
      certification: profile.certification,
      assignedEquipment: profile.assignedEquipment,
      user: { id: user?.id || profile.user.id },
    };

    try {
      if (isNewProfile) {
        const created = await profileAPI.createTechnician(requestBody);
        setProfile(prev => ({ ...prev, id: created.id }));
        replaceProfile(created);
        setSuccess('Profile created successfully!');
        setIsNewProfile(false);
      } else {
        if (!profile.id) throw new Error('Profile ID is missing. Please refresh and try again.');
        const updated = await profileAPI.updateTechnician({ ...requestBody, id: profile.id });
        setProfile(prev => ({ ...prev, id: updated.id }));
        replaceProfile(updated);
        setSuccess('Profile updated successfully!');
      }
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile');
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
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading profile...</div>
            </div>
          </main>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mb-4 sm:mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / Profile</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isNewProfile ? 'Complete Your Technician Profile' : 'Technician Profile'}
            </h1>
          </div>

          {isNewProfile && (
            <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 sm:px-6 sm:py-4">
              <AlertCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Your profile isn't complete yet</p>
                <p className="text-sm text-amber-700">Fill in the details below to get the most out of Arogya.</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6">
            {error && (
              <div className="mb-6 flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter first name"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={profile.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="+94771234567"
                  />
                </div>

                {/* NIC Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIC Number *
                  </label>
                  <input
                    type="text"
                    name="nicNumber"
                    value={profile.nicNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="123456789V or 123456789012"
                  />
                </div>

                {/* Technician Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technician Field *
                  </label>
                  <select
                    name="technicianField"
                    value={profile.technicianField}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  >
                    <option value="">Select technician field</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Emergency Medical">Emergency Medical</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Dental">Dental</option>
                    <option value="Ophthalmic">Ophthalmic</option>
                    <option value="Dialysis">Dialysis</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* License Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={profile.licenseNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter license number"
                  />
                </div>
              </div>

              {/* Certification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification *
                </label>
                <textarea
                  name="certification"
                  value={profile.certification}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="Enter your certifications and qualifications"
                />
              </div>

              {/* Assigned Equipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Equipment *
                </label>
                <textarea
                  name="assignedEquipment"
                  value={profile.assignedEquipment}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="List equipment and instruments assigned to you"
                />
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200">
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
