import React from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { UsersIcon, CalendarIcon, DownloadIcon } from 'lucide-react';
export function Dashboard() {
  const stats = [{
    label: 'Total Patients',
    value: '24,521',
    change: '+12%',
    icon: UsersIcon,
    color: '#38A3A5'
  }, {
    label: 'Clinics This Month',
    value: '32',
    change: '+8%',
    icon: CalendarIcon,
    color: '#38A3A5'
  }, {
    label: 'Doctors Active',
    value: '45',
    change: '',
    icon: UsersIcon,
    color: '#38A3A5'
  }, {
    label: 'Upcoming Clinics',
    value: '12',
    change: '',
    icon: CalendarIcon,
    color: '#38A3A5'
  }];
  return <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">Dashboard</p>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
              <DownloadIcon className="w-5 h-5" />
              Download Report
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(stat => <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    {stat.change && <span className="text-[#57CC99] text-sm font-medium">
                        {stat.change}
                      </span>}
                  </div>
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