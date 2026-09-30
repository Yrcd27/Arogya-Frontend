import { useState } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { UsersIcon, CalendarIcon, UserCheckIcon, AlertCircleIcon } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { stats, failedFields, loading, error } = useDashboardData();

  const fmt = (value: number, failed: boolean) => (failed ? '—' : value.toLocaleString());

  const dashboardStats = [
    {
      label: 'Total Patients',
      value: loading ? '...' : fmt(stats.totalPatients, failedFields.totalPatients),
      icon: UsersIcon,
      color: '#38A3A5'
    },
    {
      label: 'Total Clinics',
      value: loading ? '...' : fmt(stats.totalClinics, failedFields.totalClinics),
      icon: CalendarIcon,
      color: '#38A3A5'
    },
    {
      label: 'Total Doctors',
      value: loading ? '...' : fmt(stats.totalDoctors, failedFields.totalDoctors),
      icon: UserCheckIcon,
      color: '#38A3A5'
    },
    {
      label: 'Scheduled Clinics',
      value: loading ? '...' : fmt(stats.scheduledClinics, failedFields.scheduledClinics),
      icon: CalendarIcon,
      color: '#38A3A5'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
          </div>
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {dashboardStats.map(stat => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
                <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {loading ? (
                      <div className="w-20 h-10 bg-gray-200 rounded animate-pulse mb-1"></div>
                    ) : (
                      <p className="text-2xl lg:text-4xl font-bold text-gray-900 mb-1">
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center" style={{
                    backgroundColor: `${stat.color}20`
                  }}>
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" style={{
                      color: stat.color
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}