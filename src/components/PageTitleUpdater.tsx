import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Arogya | Mobile Clinic Patient Management Platform',
  '/login': 'Arogya | Sign In',
  '/forgot-password': 'Arogya | Account Recovery',
  '/role-selection': 'Arogya | Select Role',
  '/patient/dashboard': 'Arogya | Patient Dashboard',
  '/patient/profile': 'Arogya | Patient Profile',
  '/patient/records': 'Arogya | Prescriptions & Medical Records',
  '/patient/lab-results': 'Arogya | Lab Results',
  '/patient/clinics': 'Arogya | Mobile Clinics Schedule',
  '/doctor/dashboard': 'Arogya | Doctor Dashboard',
  '/doctor/profile': 'Arogya | Doctor Profile',
  '/doctor/queue': 'Arogya | Patient Queue',
  '/doctor/queue/create-consultation': 'Arogya | New Consultation',
  '/doctor/consultations': 'Arogya | Consultation History',
  '/admin/dashboard': 'Arogya | Administrator Dashboard',
  '/admin/profile': 'Arogya | Administrator Profile',
  '/admin/clinics': 'Arogya | Manage Mobile Clinics',
  '/admin/doctors': 'Arogya | Doctors',
  '/admin/technicians': 'Arogya | Technicians',
  '/technician/dashboard': 'Arogya | Technician Dashboard',
  '/technician/profile': 'Arogya | Technician Profile',
  '/technician/lab-tests': 'Arogya | Diagnostic Lab Tests',
};

export function PageTitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = ROUTE_TITLES[path];

    if (!title) {
      if (path.startsWith('/register/')) {
        const role = path.split('/')[2];
        const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User';
        title = `Arogya | Register as ${formattedRole}`;
      } else {
        title = 'Arogya | Page Not Found';
      }
    }

    document.title = title;
  }, [location.pathname]);

  return null;
}
