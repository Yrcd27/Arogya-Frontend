import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { PatientCard } from '../components/PatientCard';
import { SummaryCards } from '../components/SummaryCards';
export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
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