import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, CalendarIcon, UserIcon, StethoscopeIcon, FlaskConicalIcon } from 'lucide-react';
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
    path: '/admin/dashboard'
  }, {
    icon: UserIcon,
    label: 'My Profile',
    path: '/admin/profile'
  }, {
    icon: CalendarIcon,
    label: 'Clinics',
    path: '/admin/clinics'
  }, {
    icon: StethoscopeIcon,
    label: 'Doctors',
    path: '/admin/doctors'
  }, {
    icon: FlaskConicalIcon,
    label: 'Technicians',
    path: '/admin/technicians'
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
