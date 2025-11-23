import React from 'react';
import { BellIcon, UserCircleIcon, MenuIcon } from 'lucide-react';

interface TechnicianHeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: TechnicianHeaderProps) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <div>
            <h2 className="text-lg sm:text-2xl font-semibold text-gray-900">Technician Dashboard</h2>
            <p className="text-gray-600 text-sm sm:text-base hidden sm:block">Manage lab tests and equipment</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-500">
            <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <UserCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            <div className="text-sm hidden sm:block">
              <p className="font-medium text-gray-900">{user.name || 'Technician'}</p>
              <p className="text-gray-500">Technician</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}