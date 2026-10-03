import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HomeIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loginAPI, getDashboardRoute } from '../utils/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      const user = await loginAPI({ email, password });
      login(user);

      toast.success('Login successful!', {
        position: "top-right",
        autoClose: 2000,
      });

      // Redirect to intended page or dashboard based on user role
      const from = location.state?.from?.pathname || getDashboardRoute(user.userRole.roleName);

      // Small delay to show the toast before navigation
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed. Please check your credentials.', {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
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
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent"
              required
              disabled={loading}
            />
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