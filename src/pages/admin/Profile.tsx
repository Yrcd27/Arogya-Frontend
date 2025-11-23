import React, { useState, useEffect } from 'react';
import { UserIcon, SaveIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { Sidebar } from '../../components/admin/Sidebar';
import { profileAPI } from '../../services/api';

interface AdminProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  nicNumber: string;
  user: {
    id: number;
  };
}

const Profile: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    nicNumber: '',
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
            const response = await profileAPI.getAdmin(userData.id);
            setProfile(response);
          } catch (error: unknown) {
            if (error instanceof Error && (
              error.message.includes('404') || 
              error.message.includes('not found') || 
              error.message.includes('Admin Profile not found')
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
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (isNewProfile) {
        await profileAPI.createAdmin(profile as unknown as Record<string, unknown>);
        setSuccess('Profile created successfully!');
        setIsNewProfile(false);
      } else {
        await profileAPI.updateAdmin(profile.user.id, profile as unknown as Record<string, unknown>);
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
        <div className="lg:ml-64 flex flex-col">
          <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
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
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {isNewProfile ? 'Complete Your Admin Profile' : 'Admin Profile'}
                </h1>
              </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123456789V or 123456789012"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <SaveIcon className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : isNewProfile ? 'Create Profile' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;