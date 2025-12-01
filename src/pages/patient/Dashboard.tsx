import { useState } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { PatientCard } from '../../components/patient/PatientCard';
import { SummaryCards } from '../../components/patient/SummaryCards';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-1">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Patient Dashboard
            </h1>
          </div>
          <PatientCard />
          <SummaryCards />
        </main>
      </div>
    </div>;
}