import React, { useState, useEffect } from 'react';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Header } from '../../components/patient/Header';
import { Sidebar } from '../../components/patient/Sidebar';

export function Profile() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const profile = await profileAPI.getPatient(user.id);
        setFormData({
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
      } catch (error) {
        console.log('No existing profile found');
      }
    };

    fetchProfile();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!user?.id) {
        setError('User information not found. Please login again.');
        return;
      }

      const profileData = {
        ...formData,
        user: { id: user.id }
      };

      if (hasProfile) {
        // Update existing profile
        await profileAPI.updatePatient(user.id, profileData);
        setSuccess('Profile updated successfully!');
      } else {
        // Create new profile
        await profileAPI.createPatient(profileData);
        setSuccess('Profile created successfully!');
        setHasProfile(true);
      }
    } catch (error) {
      console.error('Profile operation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Patient Profile</h1>
              <p className="text-gray-600 mt-2">
                {hasProfile ? 'Update your profile information' : 'Complete your profile to get started'}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Your first name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Your last name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Your phone number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      NIC Number
                    </label>
                    <input
                      type="text"
                      name="nicNumber"
                      value={formData.nicNumber}
                      onChange={handleInputChange}
                      placeholder="National Identity Card number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Enter your address"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        placeholder="Emergency contact number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#38A3A5] text-white py-3 px-8 rounded-lg font-medium hover:bg-[#2e8285] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : (hasProfile ? 'Update Profile' : 'Create Profile')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}