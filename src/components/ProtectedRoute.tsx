import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRoute, isKnownDashboardRole } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show loading spinner or placeholder
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38A3A5] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.userRole.roleName.toLowerCase() !== requiredRole.toLowerCase()) {
    // User doesn't have the required role — send them to their own
    // dashboard, or back to login if their role isn't one we recognize.
    const userRole = user?.userRole.roleName;
    const redirectPath = isKnownDashboardRole(userRole) ? getDashboardRoute(userRole) : '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};