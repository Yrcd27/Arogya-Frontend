import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, FileTextIcon, ClipboardListIcon, FlaskConicalIcon, CalendarIcon, LogOutIcon } from 'lucide-react';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [{
    icon: HomeIcon,
    label: 'Dashboard',
    path: '/patient/dashboard'
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
  }];
  const handleNavigation = (path: string) => {
    navigate(path);
  };
  return <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Arogya</h1>
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
      </aside>;
}