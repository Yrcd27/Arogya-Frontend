import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, ClipboardListIcon, UserIcon, FileTextIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LogoutConfirmModal } from '../LogoutConfirmModal';
import { DashboardSidebar, type SidebarProps } from '../DashboardSidebar';


export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navItems = [
    {
      icon: HomeIcon,
      label: 'Dashboard',
      path: '/doctor/dashboard'
    },
    {
      icon: UserIcon,
      label: 'My Profile',
      path: '/doctor/profile'
    },
    {
      icon: ClipboardListIcon,
      label: 'Patient Queue',
      path: '/doctor/queue'
    },
    {
      icon: FileTextIcon,
      label: 'Consultations',
      path: '/doctor/consultations'
    }
  ];

  return (
    <>
      <DashboardSidebar
        isOpen={isOpen}
        onClose={onClose}
        navItems={navItems}
        onLogout={() => setShowLogoutModal(true)}
      />

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
