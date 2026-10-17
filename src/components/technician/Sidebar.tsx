import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, FlaskConicalIcon, UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LogoutConfirmModal } from '../LogoutConfirmModal';
import { DashboardSidebar, type SidebarProps } from '../DashboardSidebar';


export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [{
    icon: HomeIcon,
    label: 'Dashboard',
    path: '/technician/dashboard'
  }, {
    icon: UserIcon,
    label: 'My Profile',
    path: '/technician/profile'
  }, {
    icon: FlaskConicalIcon,
    label: 'Lab Tests',
    path: '/technician/lab-tests'
  }];

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
