import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Register() {
  const navigate = useNavigate();

  // Redirect to role selection page immediately
  useEffect(() => {
    navigate('/role-selection', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-[#38A3A5] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Redirecting to Role Selection...
        </h1>
        <p className="text-gray-600">
          Please wait while we redirect you to choose your role.
        </p>
      </div>
    </div>
  );
}