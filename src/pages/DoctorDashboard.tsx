import React, { useState } from 'react';
import { DoctorSidebar } from '../components/DoctorSidebar';
import { DoctorHeader } from '../components/DoctorHeader';
import { UsersIcon, ClipboardListIcon, CalendarIcon } from 'lucide-react';
export function DoctorDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const stats = [{
    label: 'Patients Today',
    value: '24',
    icon: UsersIcon,
    color: '#38A3A5'
  }, {
    label: 'In Queue',
    value: '5',
    icon: UsersIcon,
    color: '#38A3A5'
  }, {
    label: 'Completed Today',
    value: '19',
    icon: ClipboardListIcon,
    color: '#38A3A5'
  }, {
    label: 'Next Clinic',
    value: 'Jun 18',
    icon: CalendarIcon,
    color: '#38A3A5'
  }];
  return <div className="flex min-h-screen bg-gray-50">
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <DoctorHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Doctor Dashboard
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(stat => <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{
                backgroundColor: `${stat.color}20`
              }}>
                    <stat.icon className="w-6 h-6" style={{
                  color: stat.color
                }} />
                  </div>
                </div>
              </div>)}
          </div>
        </main>
      </div>
    </div>;
}