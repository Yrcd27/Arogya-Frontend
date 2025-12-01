import { GlobeIcon, BellIcon, ChevronDownIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useUserProfile';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { getUserDisplayName, getUserInitials, loading } = useUserProfile();

  const handleProfileClick = () => {
    navigate('/admin/profile');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            title="Toggle Sidebar"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex flex-col justify-center gap-1">
              <div className="h-0.5 bg-current rounded"></div>
              <div className="h-0.5 bg-current rounded"></div>
              <div className="h-0.5 bg-current rounded"></div>
            </div>
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="hidden md:flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
            <GlobeIcon className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">English</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
          <button 
            onClick={handleProfileClick}
            className="flex items-center gap-2 sm:gap-3 hover:bg-gray-100 px-2 sm:px-3 py-2 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#38a3a5] rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base">
              {loading ? 'AD' : getUserInitials()}
            </div>
            <span className="text-gray-700 font-medium hidden sm:block text-sm sm:text-base">
              {loading ? 'Loading...' : getUserDisplayName()}
            </span>
            <ChevronDownIcon className="w-4 h-4 text-gray-600 hidden sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}