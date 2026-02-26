import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { RoleSelection } from './pages/RoleSelection';
import { RegisterForm } from './pages/RegisterFormNew';
import { Dashboard as PatientDashboard } from './pages/patient/Dashboard';
import { Profile as PatientProfile } from './pages/patient/Profile';
import { Records as PatientRecords } from './pages/patient/Records';
import { LabResults as PatientLabResults } from './pages/patient/LabResults';
import { Clinics as PatientClinics } from './pages/patient/Clinics';
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import AdminProfile from './pages/admin/Profile';
import { Analytics as AdminAnalytics } from './pages/admin/Analytics';
import { Clinics as AdminClinics } from './pages/admin/Clinics';
import { Staff as AdminStaff } from './pages/admin/Staff';
import { Reports as AdminReports } from './pages/admin/Reports';
import { Settings as AdminSettings } from './pages/admin/Settings';
import { Dashboard as TechnicianDashboard } from './pages/technician/Dashboard';
import TechnicianProfile from './pages/technician/Profile';
import { LabTests as TechnicianLabTests } from './pages/technician/LabTests';
import { Dashboard as DoctorDashboard } from './pages/doctor/Dashboard';
import DoctorProfile from './pages/doctor/Profile';
import { Queue as DoctorQueue } from './pages/doctor/Queue';
import { CreateConsultation as DoctorCreateConsultation } from './pages/doctor/CreateConsultation';
import Consultations from './pages/doctor/Consultations';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/register/:role" element={<RegisterForm />} />
        
        {/* Patient Routes */}
        <Route path="/patient/dashboard" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/profile" element={<ProtectedRoute requiredRole="patient"><PatientProfile /></ProtectedRoute>} />
        <Route path="/patient/records" element={<ProtectedRoute requiredRole="patient"><PatientRecords /></ProtectedRoute>} />
        <Route path="/patient/lab-results" element={<ProtectedRoute requiredRole="patient"><PatientLabResults /></ProtectedRoute>} />
        <Route path="/patient/clinics" element={<ProtectedRoute requiredRole="patient"><PatientClinics /></ProtectedRoute>} />
        
        {/* Doctor Routes */}
        <Route path="/doctor/dashboard" element={<ProtectedRoute requiredRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/profile" element={<ProtectedRoute requiredRole="doctor"><DoctorProfile /></ProtectedRoute>} />
        <Route path="/doctor/queue" element={<ProtectedRoute requiredRole="doctor"><DoctorQueue /></ProtectedRoute>} />
        <Route path="/doctor/queue/create-consultation" element={<ProtectedRoute requiredRole="doctor"><DoctorCreateConsultation /></ProtectedRoute>} />
        <Route path="/doctor/consultations" element={<ProtectedRoute requiredRole="doctor"><Consultations /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><AdminProfile /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/clinics" element={<ProtectedRoute requiredRole="admin"><AdminClinics /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute requiredRole="admin"><AdminStaff /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
        
        {/* Technician Routes */}
        <Route path="/technician/dashboard" element={<ProtectedRoute requiredRole="technician"><TechnicianDashboard /></ProtectedRoute>} />
        <Route path="/technician/profile" element={<ProtectedRoute requiredRole="technician"><TechnicianProfile /></ProtectedRoute>} />
        <Route path="/technician/lab-tests" element={<ProtectedRoute requiredRole="technician"><TechnicianLabTests /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}