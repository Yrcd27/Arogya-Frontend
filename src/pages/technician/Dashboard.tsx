import { useState } from 'react';
import { Header } from '../../components/technician/Header';
import { Sidebar } from '../../components/technician/Sidebar';
import { FlaskConicalIcon, ClipboardListIcon, SettingsIcon, UserCheckIcon } from 'lucide-react';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const stats = [
    {
      title: 'Pending Tests',
      value: '24',
      icon: FlaskConicalIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Completed Today',
      value: '18',
      icon: UserCheckIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'In Queue',
      value: '6',
      icon: ClipboardListIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Equipment Status',
      value: 'All OK',
      icon: SettingsIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="md:ml-64 flex flex-col">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-4">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Welcome Back!</h1>
              <p className="text-gray-600 text-sm lg:text-base">Here's an overview of your lab activities today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent Tests */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Test Results</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Blood Test - Patient #{1000 + item}</p>
                          <p className="text-xs sm:text-sm text-gray-500">Completed 2 hours ago</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Complete
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Upcoming Tasks */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Urine Analysis - Patient #{2000 + item}</p>
                          <p className="text-xs sm:text-sm text-gray-500">Scheduled in 30 minutes</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}