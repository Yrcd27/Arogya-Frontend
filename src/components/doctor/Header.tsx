import { HeaderLanguageSelector } from '../LanguageSelectors';

interface DoctorHeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: DoctorHeaderProps) {
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
          <h2 className="whitespace-nowrap text-lg sm:text-xl font-bold text-gray-900">Dashboard</h2>
        </div>
        <div className="flex items-center">
          <HeaderLanguageSelector />
        </div>
      </div>
    </header>
  );
}
