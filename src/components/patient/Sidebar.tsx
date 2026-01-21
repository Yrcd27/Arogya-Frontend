import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, FileTextIcon, ClipboardListIcon, FlaskConicalIcon, CalendarIcon, UserIcon, LogOutIcon, HospitalIcon, XIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LogoutConfirmModal } from '../LogoutConfirmModal';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navItems = [{
    icon: HomeIcon,
    label: 'Dashboard',
    path: '/patient/dashboard'
  }, {
    icon: UserIcon,
    label: 'My Profile',
    path: '/patient/profile'
  }, {
    icon: FileTextIcon,
    label: 'My Records',
    path: '/patient/records'
  }, {
    icon: ClipboardListIcon,
    label: 'Prescriptions',
    path: '/patient/prescriptions'
  }, {
    icon: FlaskConicalIcon,
    label: 'Lab Results',
    path: '/patient/lab-results'
  }, {
    icon: CalendarIcon,
    label: 'Appointments',
    path: '/patient/appointments'
  }, {
    icon: HospitalIcon,
    label: 'Mobile Clinics',
    path: '/patient/clinics'
  }];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose?.(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Arogya</h1>
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-3 sm:px-4 space-y-1 sm:space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg
                transition-colors duration-200 text-sm sm:text-base
                ${location.pathname === item.path ? 'bg-[#38a3a5] text-white' : 'text-gray-700 hover:bg-gray-100'}
              `}
            >
              <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 sm:p-4 border-t border-gray-200">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
          >
            <LogOutIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={() => {
          logout();
          navigate('/', { replace: true });
          onClose?.();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}