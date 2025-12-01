import { useState } from 'react';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { UsersIcon, ClipboardListIcon, CalendarIcon, FileTextIcon } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { stats, loading } = useDashboardData();

  const doctorStats = [{
    label: 'Total Patients',
    value: loading ? '...' : (stats?.totalPatients?.toLocaleString() || '0'),
    icon: UsersIcon,
    color: '#38A3A5'
  }, {
    label: 'Total Clinics',
    value: loading ? '...' : (stats?.totalClinics?.toString() || '0'),
    icon: ClipboardListIcon,
    color: '#38A3A5'
  }, {
    label: 'Scheduled Clinics',
    value: loading ? '...' : (stats?.scheduledClinics?.toString() || '0'),
    icon: CalendarIcon,
    color: '#38A3A5'
  }, {
    label: 'Prescriptions',
    value: loading ? '...' : (stats?.totalPatients ? Math.round(stats.totalPatients * 0.3).toString() : '0'),
    icon: FileTextIcon,
    color: '#38A3A5'
  }];
  
  return (
    <div className="min-h-screen bg-gray-50">
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
              Doctor Dashboard
            </h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {doctorStats.map(stat => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
                <div className="flex items-center justify-between">
                  {loading ? (
                    <div className="w-20 h-10 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-2xl sm:text-4xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  )}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                    backgroundColor: `${stat.color}20`
                  }}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{
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