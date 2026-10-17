import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HomeIcon, Eye, EyeOff } from 'lucide-react';
import { userAPI } from '../services/api';
import { ApiError } from '../services/httpClient';
import { EMAIL_MAX_LENGTH, PASSWORD_REQUIREMENTS, USERNAME_MAX_LENGTH, focusFirstInvalidField, getApiFieldErrors, getConfirmationError, getEmailError, getPasswordPolicyError, getUsernameError, normalizeEmail, type FieldErrors } from '../utils/formValidation';

type RegisterField = 'username' | 'email' | 'password' | 'confirmPassword' | 'secretKey';

export function RegisterForm() {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();
  
  const [formData, setFormData] = useState({
    // Basic user info only
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    secretKey: '',
  });

  const [loading, setLoading] = useState(false);
  const [visibleFields, setVisibleFields] = useState({ secretKey: false, password: false, confirmPassword: false });
  const toggleVisibility = (field: keyof typeof visibleFields) =>
    setVisibleFields(previous => ({ ...previous, [field]: !previous[field] }));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});
  const submittingRef = useRef(false);
  const [roleInfo, setRoleInfo] = useState<{
    id: number;
    roleName: string;
    roleDescription?: string;
  } | null>(null);

  useEffect(() => {
    if (role) {
      const roleMap = {
        'patient': { id: 2, roleName: 'Patient', roleDescription: 'Patient role' },
        'doctor': { id: 1, roleName: 'Doctor', roleDescription: 'Doctor role' },
        'admin': { id: 4, roleName: 'Admin', roleDescription: 'Administrator role' },
        'technician': { id: 5, roleName: 'Technician', roleDescription: 'Technician role' }
      };
      
      const roleKey = role.toLowerCase();
      const roleInfo = Object.prototype.hasOwnProperty.call(roleMap, roleKey)
        ? roleMap[roleKey as keyof typeof roleMap] : undefined;
      if (roleInfo) {
        setRoleInfo(roleInfo);
      } else {
        navigate('/role-selection');
      }
    } else {
      navigate('/role-selection');
    }
    setFieldErrors({});
    setError('');
  }, [role, navigate]);

  const getFieldError = (name: RegisterField, value: string, values = formData): string | undefined => {
    switch (name) {
      case 'username': return getUsernameError(value);
      case 'email': return getEmailError(value);
      case 'password': return getPasswordPolicyError(value, 'Please enter a password.');
      case 'confirmPassword': return getConfirmationError(values.password, value);
      case 'secretKey': return roleInfo?.roleName !== 'Patient' && !value.trim() ? 'Please enter the secret key for this role.' : undefined;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const field = name as RegisterField;
    const next = { ...formData, [field]: value };
    setFormData(next);
    setError('');
    setFieldErrors(previous => ({
      ...previous,
      [field]: previous[field] ? getFieldError(field, value, next) : undefined,
      ...(field === 'password' && formData.confirmPassword
        ? { confirmPassword: getConfirmationError(value, formData.confirmPassword) }
        : {}),
    }));
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const field = event.target.name as RegisterField;
    const value = field === 'email' ? normalizeEmail(event.target.value)
      : field === 'username' ? event.target.value.trim() : event.target.value;
    setFormData(previous => ({ ...previous, [field]: value }));
    setFieldErrors(previous => ({ ...previous, [field]: getFieldError(field, value) ?? previous[field] }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    setError('');
    if (!roleInfo) {
      setError('Role information is missing. Please select your role again.');
      return;
    }
    const nextErrors: FieldErrors<RegisterField> = {};
    const fields: RegisterField[] = ['username', 'email', 'password', 'confirmPassword', 'secretKey'];
    fields.forEach(field => {
      const message = getFieldError(field, formData[field]);
      if (message) nextErrors[field] = message;
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstInvalidField(form);
      return;
    }
    const username = formData.username.trim();
    const email = normalizeEmail(formData.email);
    setFormData(previous => ({ ...previous, username, email }));
    submittingRef.current = true;
    setLoading(true);

    try {

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
        username,
        email,
        password: formData.password,
        userRole: {
          id: roleInfo.id,
          roleName: roleInfo.roleName
        }
      };

      // Add secret key if needed
      if (roleInfo.roleName !== 'Patient' && formData.secretKey.trim()) {
        userRegistrationData.secretKey = formData.secretKey.trim();
      }

      await userAPI.register(userRegistrationData);

      // Success - redirect to login (no profile creation during registration)
      toast.success(`Registration successful! Welcome, ${username}!`, {
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
          email
        } 
      });

    } catch (error) {
      const serverErrors = getApiFieldErrors(error, ['username', 'email', 'password', 'confirmPassword', 'secretKey'] as const);
      if (Object.keys(serverErrors).length) {
        setFieldErrors(serverErrors);
        focusFirstInvalidField(form);
        return;
      }
      let errorMessage = 'Registration failed. Please try again.';

      if (error instanceof ApiError) {
        switch (error.status) {
          case 0:
            errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
            break;
          case 400:
            errorMessage = error.message || 'Invalid registration data. Please check your information.';
            break;
          case 409:
            errorMessage = 'Registration could not be completed. The username or email may already be in use. Please try different details.';
            break;
          case 401:
          case 403:
            errorMessage = 'Registration was not permitted. Please check your role credentials or contact your administrator.';
            break;
          case 500:
            errorMessage = roleInfo.roleName !== 'Patient'
              ? 'Registration failed. Please check that your secret key is correct and try again. If the problem continues, contact your administrator.'
              : 'Registration failed due to a server error. Please try again later.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      submittingRef.current = false;
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Go to home"
        className="hidden md:flex group absolute top-7 left-8 z-10 items-center w-11 hover:w-28 focus-visible:w-28 h-11 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(15,28,43,0.06)] transition-[width,background-color] duration-[220ms] ease hover:bg-[#38A3A5]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-[#38A3A5]">
          <HomeIcon className="w-5 h-5" />
        </span>
        <span className="whitespace-nowrap pr-4 text-sm font-medium text-[#111827] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
          Home
        </span>
      </button>
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Go to home"
          className="md:hidden inline-flex items-center gap-2 h-10 px-4 mb-6 rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(15,28,43,0.06)] text-sm font-medium text-[#111827] hover:bg-[#38A3A5]/10 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
        >
          <HomeIcon className="w-4 h-4 text-[#38A3A5]" />
          Home
        </button>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Register as {roleInfo.roleName}
          </h2>
          <p className="text-gray-600">
            {roleInfo.roleDescription || `Create your ${roleInfo.roleName.toLowerCase()} account`}
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <form onSubmit={handleRegister} noValidate className="space-y-6">
            {/* Error Display */}
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

            {/* Secret Key Field (for protected roles) */}
            {roleInfo.roleName !== 'Patient' && (
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
                      <label htmlFor="register-secretKey" className="block text-sm font-medium text-gray-900 mb-2">
                        Secret Key *
                      </label>
                      <div className="relative">
                        <input
                          type={visibleFields.secretKey ? 'text' : 'password'}
                          name="secretKey"
                          id="register-secretKey"
                          aria-invalid={!!fieldErrors.secretKey}
                          aria-describedby={fieldErrors.secretKey ? 'register-secretKey-error' : undefined}
                          value={formData.secretKey}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="Enter secret key"
                          className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                          required
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => toggleVisibility('secretKey')}
                          aria-label={visibleFields.secretKey ? 'Hide secret key' : 'Show secret key'}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                        >
                          {visibleFields.secretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {fieldErrors.secretKey && <p id="register-secretKey-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.secretKey}</p>}
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
                  <label htmlFor="register-username" className="block text-sm font-medium text-gray-900 mb-2">
                    Username *
                  </label>
                  <input 
                    type="text" 
                    name="username"
                    id="register-username"
                    maxLength={USERNAME_MAX_LENGTH}
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? 'register-username-error' : undefined}
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Choose a username" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                    required
                    disabled={loading}
                  />
                  {fieldErrors.username && <p id="register-username-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.username}</p>}
                </div>
                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-900 mb-2">
                    Email *
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    id="register-email"
                    maxLength={EMAIL_MAX_LENGTH}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    placeholder="Enter your email" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" 
                    required
                    disabled={loading}
                  />
                  {fieldErrors.email && <p id="register-email-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-900 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields.password ? 'text' : 'password'}
                      name="password"
                      id="register-password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Create a password"
                      className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('password')}
                      aria-label={visibleFields.password ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {visibleFields.password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.password && getPasswordPolicyError(formData.password, '') && fieldErrors.password !== PASSWORD_REQUIREMENTS && (
                    <p className="mt-1.5 text-xs text-gray-500">{PASSWORD_REQUIREMENTS}</p>
                  )}
                  {fieldErrors.password && <p id="register-password-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.password}</p>}
                </div>
                <div>
                  <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={visibleFields.confirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      id="register-confirmPassword"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={fieldErrors.confirmPassword ? 'register-confirmPassword-error' : undefined}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Confirm your password"
                      className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('confirmPassword')}
                      aria-label={visibleFields.confirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {visibleFields.confirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p id="register-confirmPassword-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
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
