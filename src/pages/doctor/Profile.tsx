import React, { useState, useEffect } from 'react';
import { SaveIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { Header } from '../../components/doctor/Header';
import { Sidebar } from '../../components/doctor/Sidebar';
import { profileAPI } from '../../services/api';

interface DoctorProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  nicNumber: string;
  licenseNumber: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  user: {
    id: number;
  };
}

const Profile: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<DoctorProfile>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    nicNumber: '',
    licenseNumber: '',
    specialization: '',
    qualification: '',
    experienceYears: 0,
    user: {
      id: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.id) {
          setProfile(prev => ({ ...prev, user: { id: userData.id } }));
          
          try {
            const response = await profileAPI.getDoctor(userData.id);
            setProfile(response);
          } catch (error: unknown) {
            if (error instanceof Error && (
              error.message.includes('404') || 
              error.message.includes('not found') || 
              error.message.includes('Doctor Profile not found')
            )) {
              // Profile doesn't exist yet
              setIsNewProfile(true);
              setProfile(prev => ({ 
                ...prev, 
                user: { id: userData.id }
              }));
            } else {
              throw error;
            }
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === 'experienceYears' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isNewProfile) {
        await profileAPI.createDoctor(profile as unknown as Record<string, unknown>);
        setSuccess('Profile created successfully!');
        setIsNewProfile(false);
      } else {
        await profileAPI.updateDoctor(profile.user.id, profile as unknown as Record<string, unknown>);
        setSuccess('Profile updated successfully!');
      }
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
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
      <div className="lg:ml-64 flex flex-col">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="mb-4 sm:mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / Profile</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isNewProfile ? 'Complete Your Doctor Profile' : 'Doctor Profile'}
            </h1>
          </div>

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

                {/* Medical License Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={profile.licenseNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Enter medical license number"
                  />
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization *
                  </label>
                  <select
                    name="specialization"
                    value={profile.specialization}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  >
                    <option value="">Select specialization</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Family Medicine">Family Medicine</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Urology">Urology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Experience Years */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience (Years) *
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={profile.experienceYears}
                    onChange={handleInputChange}
                    required
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                    placeholder="Years of experience"
                  />
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Qualifications *
                </label>
                <textarea
                  name="qualification"
                  value={profile.qualification}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                  placeholder="Enter your medical qualifications (e.g., MBBS, MD, Fellowship details)"
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