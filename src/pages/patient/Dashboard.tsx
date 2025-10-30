import React from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { PatientCard } from '../../components/patient/PatientCard';
import { SummaryCards } from '../../components/patient/SummaryCards';
export function Dashboard() {
  return <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Patient Dashboard
            </h1>
          </div>
          <PatientCard />
          <SummaryCards />
        </main>
      </div>
    </div>;
}