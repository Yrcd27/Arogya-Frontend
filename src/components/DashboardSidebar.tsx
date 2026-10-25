import { Link, useLocation } from 'react-router-dom';
import { LogOutIcon, XIcon, type LucideIcon } from 'lucide-react';
import arogyaLogo from '../assets/logo/arogya_logo.png';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface DashboardSidebarProps extends SidebarProps {
  navItems: readonly { icon: LucideIcon; label: string; path: string }[];
  onLogout: () => void;
}

export function DashboardSidebar({ isOpen = true, onClose, navItems, onLogout }: DashboardSidebarProps) {
  const location = useLocation();
  const itemClass = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base leading-6 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Dashboard sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center">
              <img
                src={arogyaLogo}
                alt="Arogya Mobile Clinics logo"
                width={45}
                height={45}
                className="h-[45px] w-[45px] object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-6 text-gray-900">Arogya</p>
              <p className="mt-0.5 whitespace-nowrap text-xs leading-4 text-gray-500">Mobile Clinics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 md:hidden"
          >
            <XIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.matchMedia('(max-width: 767px)').matches) onClose?.();
              }}
              aria-current={location.pathname === item.path ? 'page' : undefined}
              className={`${itemClass} ${location.pathname === item.path ? 'bg-[#38A3A5] font-semibold text-white' : 'font-medium text-gray-700 hover:bg-gray-50 hover:text-[#2d8284]'}`}
            >
              <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="shrink-0 border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={onLogout}
            className={`${itemClass} font-medium text-gray-700 hover:bg-gray-50 hover:text-[#2d8284]`}
          >
            <LogOutIcon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="min-w-0 truncate">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
