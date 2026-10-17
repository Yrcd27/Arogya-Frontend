import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HomeIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loginAPI, getDashboardRoute } from '../utils/auth';
import { focusFirstInvalidField, getApiFieldErrors, getEmailError, normalizeEmail } from '../utils/formValidation';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState<string>(typeof location.state?.email === 'string' ? location.state.email : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.messages && Array.isArray(location.state.messages)) {
      location.state.messages.forEach((msg: string) => {
        toast.success(msg, {
          position: "top-right",
          autoClose: 5000,
        });
      });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    } else if (location.state?.message) {
      toast.success(location.state.message, {
        position: "top-right",
        autoClose: 3000,
      });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    setFormError('');
    const cleanEmail = normalizeEmail(email);
    const nextEmailError = getEmailError(cleanEmail);
    const nextPasswordError = !password ? 'Please enter your password.' : undefined;
    setEmail(cleanEmail);
    setEmailError(nextEmailError || '');
    setPasswordError(nextPasswordError || '');
    if (nextEmailError || nextPasswordError) {
      focusFirstInvalidField(form);
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const user = await loginAPI({ email: cleanEmail, password });
      login(user);

      toast.success('Login successful!', {
        position: "top-right",
        autoClose: 2000,
      });

      // Redirect to intended page or dashboard based on user role
      const from = location.state?.from?.pathname || getDashboardRoute(user.userRole.roleName);

      navigate(from, { replace: true });

    } catch (err) {
      const fieldErrors = getApiFieldErrors(err, ['email', 'password'] as const);
      setEmailError(fieldErrors.email || '');
      setPasswordError(fieldErrors.password || '');
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      if (Object.keys(fieldErrors).length) focusFirstInvalidField(form);
      else setFormError(msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 relative">
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
    <div className="max-w-md w-full">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Arogya
        </h1>
        <p className="text-gray-600">Sign in to access your account</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-8">
        {formError && (
          <div role="alert" className="mb-6 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleLogin} noValidate className="space-y-6">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : undefined}
              autoComplete="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError(getEmailError(e.target.value) || '');
                if (formError) setFormError('');
              }}
              onBlur={() => {
                setEmail(normalizeEmail(email));
                setEmailError(previous => getEmailError(email) || previous);
              }}
              placeholder="Enter your email"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                emailError
                  ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                  : 'border-gray-300 focus:ring-[#38A3A5]'
              }`}
              disabled={loading}
            />
            {emailError && (
              <p id="login-email-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-medium text-[#38A3A5] hover:text-[#2d8284] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                required
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'login-password-error' : undefined}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(e.target.value ? '' : 'Please enter your password.');
                  if (formError) setFormError('');
                }}
                onBlur={() => setPasswordError(previous => password ? previous : 'Please enter your password.')}
                placeholder="Enter your password"
                className={`w-full pl-4 pr-11 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
                  passwordError
                    ? 'border-red-400 focus:ring-red-400 bg-red-50/20'
                    : 'border-gray-300 focus:ring-[#38A3A5]'
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwordError && (
              <p id="login-password-error" role="alert" className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-[#38A3A5] text-white py-3 rounded-lg font-semibold hover:bg-[#2d8284] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button onClick={() => navigate('/role-selection')} className="text-[#38A3A5] font-semibold hover:underline">
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>;
}
