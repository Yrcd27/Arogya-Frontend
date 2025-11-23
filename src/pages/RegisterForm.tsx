import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { registerAPI } from '../utils/auth';

export function RegisterForm() {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();
  const location = useLocation();
  const { roleId, roleName, requiresSecret } = location.state || {};

  const [formData, setFormData] = useState({
    // Basic user info
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Profile info
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    nicNumber: '',
    // Role-specific fields
    secretKey: '',
    // Patient fields
    address: '',
    gender: '',
    bloodGroup: '',
    allergies: '',
    chronicDiseases: '',
    emergencyContact: '',
    // Doctor fields
    licenseNumber: '',
    specialization: '',
    qualification: '',
    experienceYears: '',
    // Technician fields
    technicianField: '',
    certification: '',
    assignedEquipment: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if no role data
  useEffect(() => {
    if (!roleId || !roleName) {
      navigate('/role-selection');
    }
  }, [roleId, roleName, navigate]);

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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.username || !formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      // Convert experienceYears to number if it's a string
      const processedFormData = {
        ...formData,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
      };
      
      const response = await registerAPI(processedFormData, roleId, roleName);
      
      if (response.success) {
        navigate('/login', { 
          state: { message: response.message } 
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('Unable to connect')) {
          errorMessage = 'Unable to connect to the server. Please check if the backend service is running on port 8081.';
        } else if (err.message.includes('404')) {
          errorMessage = 'Registration service is not available. Please contact support.';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid registration data. Please check your information.';
        } else if (err.message.includes('409')) {
          errorMessage = 'An account with this email already exists.';
        } else if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'Invalid credentials. Please check your information.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSpecificFields = () => {
    switch (role?.toLowerCase()) {
      case 'patient':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Address
                </label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  disabled={loading}
                />
              </div>
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
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <option value="">Select blood group</option>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Allergies
                </label>
                <textarea 
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  placeholder="Any known allergies (optional)" 
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Chronic Diseases
                </label>
                <textarea 
                  name="chronicDiseases"
                  value={formData.chronicDiseases}
                  onChange={handleInputChange}
                  placeholder="Any chronic diseases (optional)" 
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  disabled={loading}
                />
              </div>
            </div>
          </>
        );

      case 'doctor':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Medical License Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="Enter medical license number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  placeholder="Enter your specialization" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Qualification <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  placeholder="e.g., MBBS, MD" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Experience Years <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  placeholder="Years of experience" 
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </>
        );

      case 'technician':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Technician Field <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="technicianField"
                  value={formData.technicianField}
                  onChange={handleInputChange}
                  placeholder="e.g., Radiology, Laboratory" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  License Number
                </label>
                <input 
                  type="text" 
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="Technician license number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Certification
                </label>
                <input 
                  type="text" 
                  name="certification"
                  value={formData.certification}
                  onChange={handleInputChange}
                  placeholder="Professional certifications" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Assigned Equipment
                </label>
                <input 
                  type="text" 
                  name="assignedEquipment"
                  value={formData.assignedEquipment}
                  onChange={handleInputChange}
                  placeholder="Equipment you operate" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  disabled={loading}
                />
              </div>
            </div>
          </>
        );

      case 'admin':
        return null; // Admin only needs basic profile info

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-[#38A3A5] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Register as {roleName}
          </h1>
          <p className="text-gray-600">Create your account for Arogya healthcare system</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Secret Key Field for restricted roles */}
            {requiresSecret && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Secret Key <span className="text-red-500">*</span>
                </label>
                <input 
                  type="password" 
                  name="secretKey"
                  value={formData.secretKey}
                  onChange={handleInputChange}
                  placeholder="Enter the secret key for this role" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
                <p className="text-yellow-800 text-sm mt-2">
                  ⚠️ You need a valid secret key to register as {roleName}
                </p>
              </div>
            )}

            {/* Basic User Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required 
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Email <span className="text-red-500">*</span>
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

            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required 
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required 
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  NIC Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="nicNumber"
                  value={formData.nicNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your NIC" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter phone number" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                required
                disabled={loading}
              />
            </div>

            {/* Role-specific fields */}
            {renderRoleSpecificFields()}

            {/* Password fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Password <span className="text-red-500">*</span>
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
                  Confirm Password <span className="text-red-500">*</span>
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

            <button 
              type="submit" 
              className="w-full bg-[#38A3A5] text-white py-3 rounded-lg font-semibold hover:bg-[#2d8284] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : `Register as ${roleName}`}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-[#38A3A5] font-semibold hover:underline">
                Sign In
              </button>
            </p>
            <button 
              onClick={() => navigate('/role-selection')} 
              className="text-gray-500 hover:text-gray-700 font-medium mt-2"
            >
              ← Choose Different Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}