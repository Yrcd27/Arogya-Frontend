import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI } from '../services/api';

export function RegisterForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useParams<{ role: string }>();
  
  // Get role data from navigation state
  const { roleData } = location.state || {};
  
  const [formData, setFormData] = useState({
    // Basic user info only
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    secretKey: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleInfo, setRoleInfo] = useState<{
    id: number;
    roleName: string;
    roleDescription?: string;
  } | null>(null);

  useEffect(() => {
    // Use role data from navigation state instead of API call
    if (roleData) {
      setRoleInfo(roleData);
    } else if (role) {
      // If no roleData but we have role param, create role info based on param
      const roleMap = {
        'patient': { id: 2, roleName: 'PATIENT', roleDescription: 'Patient role' },
        'doctor': { id: 1, roleName: 'DOCTOR', roleDescription: 'Doctor role' },
        'admin': { id: 4, roleName: 'ADMIN', roleDescription: 'Administrator role' },
        'technician': { id: 5, roleName: 'TECHNICIAN', roleDescription: 'Technician role' }
      };
      
      const roleInfo = roleMap[role.toLowerCase() as keyof typeof roleMap];
      if (roleInfo) {
        setRoleInfo(roleInfo);
      } else {
        navigate('/role-selection');
      }
    } else {
      navigate('/role-selection');
    }
  }, [role, roleData, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!formData.username || !formData.email || !formData.password) {
        setError('Please fill in all required fields');
        return;
      }

      if (!roleInfo) {
        setError('Role information is missing. Please try again.');
        return;
      }

      // Check secret key for protected roles
      if ((roleInfo.roleName === 'DOCTOR' || roleInfo.roleName === 'ADMIN' || roleInfo.roleName === 'TECHNICIAN') && 
          (!formData.secretKey || formData.secretKey.trim() === '')) {
        setError('Secret key is required for this role');
        return;
      }

      // Step 1: Create user account
      const userRegistrationData: {
        username: string;
        email: string;
        password: string;
        userRole: {
          id: number;
          roleName: string;
        };
        secretKey?: string;
      } = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        userRole: {
          id: roleInfo.id,
          roleName: roleInfo.roleName
        }
      };

      // Add secret key if needed
      if (roleInfo.roleName !== 'PATIENT' && formData.secretKey) {
        userRegistrationData.secretKey = formData.secretKey;
      }

      console.log('Creating user account with data:', userRegistrationData);
      const newUser = await userAPI.register(userRegistrationData);
      console.log('User created successfully:', newUser);

      // Success - redirect to login (no profile creation during registration)
      toast.success(`Registration successful! Welcome, ${formData.username}!`, {
        position: "top-right",
        autoClose: 3000,
      });
      
      setTimeout(() => {
        toast.info('Please login with your credentials.', {
          position: "top-right",
          autoClose: 5000,
        });
      }, 500);
       
      navigate('/login', { 
        state: { 
          email: formData.email 
        } 
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Unable to connect')) {
          errorMessage = 'Unable to connect to the server. Please check if the backend service is running on port 8081.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Registration service is not available. Please contact support.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid registration data. Please check your information.';
        } else if (error.message.includes('409')) {
          errorMessage = 'An account with this email already exists.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Invalid secret key. Please check your credentials.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSpecificFields = () => {
    // Profile information will be collected after login in dashboard
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              After registration, you'll be able to complete your {roleInfo?.roleName.toLowerCase()} profile information in your dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!roleInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#38A3A5]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Register as {roleInfo.roleName}
          </h2>
          <p className="text-gray-600">
            {roleInfo.roleDescription || `Create your ${roleInfo.roleName.toLowerCase()} account`}
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Error Display */}
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

            {/* Secret Key Field (for protected roles) */}
            {roleInfo.roleName !== 'PATIENT' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-yellow-800 mb-3">
                      This role requires a secret key for registration. Please contact your administrator to obtain the key.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Secret Key *
                      </label>
                      <input 
                        type="password" 
                        name="secretKey"
                        value={formData.secretKey}
                        onChange={handleInputChange}
                        placeholder="Enter secret key"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Username *
                  </label>
                  <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Choose a username" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email *
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Password *
                  </label>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Confirm Password *
                  </label>
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Role-specific Information Notice */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                What's Next?
              </h3>
              {renderRoleSpecificFields()}
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate('/role-selection')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Back to Role Selection
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#38A3A5] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#2e8285] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}