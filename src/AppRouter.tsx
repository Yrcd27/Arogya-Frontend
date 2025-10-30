import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard as PatientDashboard } from './pages/patient/Dashboard';
import { Records as PatientRecords } from './pages/patient/Records';
import { Prescriptions as PatientPrescriptions } from './pages/patient/Prescriptions';
import { LabResults as PatientLabResults } from './pages/patient/LabResults';
import { Appointments as PatientAppointments } from './pages/patient/Appointments';
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import { Analytics as AdminAnalytics } from './pages/admin/Analytics';
import { Clinics as AdminClinics } from './pages/admin/Clinics';
import { Staff as AdminStaff } from './pages/admin/Staff';
import { Reports as AdminReports } from './pages/admin/Reports';
import { Settings as AdminSettings } from './pages/admin/Settings';
import { Dashboard as DoctorDashboard } from './pages/doctor/Dashboard';
import { Queue as DoctorQueue } from './pages/doctor/Queue';
import { Records as DoctorRecords } from './pages/doctor/Records';
import { Prescriptions as DoctorPrescriptions } from './pages/doctor/Prescriptions';
import { LabResults as DoctorLabResults } from './pages/doctor/LabResults';
export function AppRouter() {
  return <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/records" element={<PatientRecords />} />
        <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
        <Route path="/patient/lab-results" element={<PatientLabResults />} />
        <Route path="/patient/appointments" element={<PatientAppointments />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/clinics" element={<AdminClinics />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/queue" element={<DoctorQueue />} />
        <Route path="/doctor/records" element={<DoctorRecords />} />
        <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
        <Route path="/doctor/lab-results" element={<DoctorLabResults />} />
      </Routes>
    </BrowserRouter>;
}