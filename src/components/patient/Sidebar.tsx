import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, FileTextIcon, FlaskConicalIcon, UserIcon, HospitalIcon } from 'lucide-react';
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
    path: '/patient/dashboard'
  }, {
    icon: UserIcon,
    label: 'My Profile',
    path: '/patient/profile'
  }, {
    icon: FileTextIcon,
    label: 'Prescriptions',
    path: '/patient/records'
  }, {
    icon: FlaskConicalIcon,
    label: 'Lab Results',
    path: '/patient/lab-results'
  }, {
    icon: HospitalIcon,
    label: 'Mobile Clinics',
    path: '/patient/clinics'
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
