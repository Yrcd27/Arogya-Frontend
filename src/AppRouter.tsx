import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { MyRecords } from './pages/MyRecords';
import { Prescriptions } from './pages/Prescriptions';
import { LabResults } from './pages/LabResults';
import { Appointments } from './pages/Appointments';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { AdminClinics } from './pages/AdminClinics';
import { AdminStaff } from './pages/AdminStaff';
import { AdminReports } from './pages/AdminReports';
import { AdminSettings } from './pages/AdminSettings';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorQueue } from './pages/DoctorQueue';
import { DoctorRecords } from './pages/DoctorRecords';
import { DoctorPrescriptions } from './pages/DoctorPrescriptions';
import { DoctorLabResults } from './pages/DoctorLabResults';
export function AppRouter() {
  return <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/patient/dashboard" element={<Dashboard />} />
        <Route path="/patient/records" element={<MyRecords />} />
        <Route path="/patient/prescriptions" element={<Prescriptions />} />
        <Route path="/patient/lab-results" element={<LabResults />} />
        <Route path="/patient/appointments" element={<Appointments />} />
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