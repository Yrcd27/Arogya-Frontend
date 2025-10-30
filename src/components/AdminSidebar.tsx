import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, BarChartIcon, CalendarIcon, UsersIcon, FileTextIcon, SettingsIcon, LogOutIcon, XIcon } from 'lucide-react';
interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
export function AdminSidebar({
  isOpen,
  onClose
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [{
    icon: HomeIcon,
    label: 'Dashboard',
    path: '/admin/dashboard'
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
    onClose();
  };
  return <>
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Arogya</h1>
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => <button key={item.label} onClick={() => handleNavigation(item.path)} className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-colors duration-200
                ${location.pathname === item.path ? 'bg-[#38a3a5] text-white' : 'text-gray-700 hover:bg-gray-100'}
              `}>
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>)}
        </nav>
        <div className="p-4">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <LogOutIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>;
}