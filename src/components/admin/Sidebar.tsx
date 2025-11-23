import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, BarChartIcon, CalendarIcon, UsersIcon, FileTextIcon, SettingsIcon, LogOutIcon, UserIcon, XIcon } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [{
    icon: HomeIcon,
    label: 'Dashboard',
    path: '/admin/dashboard'
  }, {
    icon: UserIcon,
    label: 'My Profile',
    path: '/admin/profile'
  }, {
    icon: BarChartIcon,
    label: 'Analytics',
    path: '/admin/analytics'
  }, {
    icon: CalendarIcon,
    label: 'Clinics',
    path: '/admin/clinics'
  }, {
    icon: UsersIcon,
    label: 'Staff',
    path: '/admin/staff'
  }, {
    icon: FileTextIcon,
    label: 'Reports',
    path: '/admin/reports'
  }, {
    icon: SettingsIcon,
    label: 'Settings',
    path: '/admin/settings'
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
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
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
            onClick={() => { navigate('/'); onClose?.(); }}
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
          >
            <LogOutIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}