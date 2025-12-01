import { useState } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

export function Analytics() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const metrics = [{
    label: 'Total Visits',
    value: '45,678',
    change: '+15%',
    trend: 'up'
  }, {
    label: 'New Patients',
    value: '2,345',
    change: '+8%',
    trend: 'up'
  }, {
    label: 'Avg Wait Time',
    value: '18 min',
    change: '-12%',
    trend: 'down'
  }, {
    label: 'Patient Satisfaction',
    value: '94%',
    change: '+3%',
    trend: 'up'
  }];
  const monthlyData = [{
    month: 'Jan',
    patients: 3200
  }, {
    month: 'Feb',
    patients: 3400
  }, {
    month: 'Mar',
    patients: 3800
  }, {
    month: 'Apr',
    patients: 4100
  }, {
    month: 'May',
    patients: 3900
  }, {
    month: 'Jun',
    patients: 4500
  }];
  return <div className="min-h-screen bg-gray-50">
    <Sidebar
      isOpen={isSidebarOpen}
      onClose={() => setIsSidebarOpen(false)}
    />
    <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6">
          <p className="text-gray-600 text-sm mb-2">Dashboard / Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map(metric => <div key={metric.label} className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-gray-600 text-sm mb-2">{metric.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">
                {metric.value}
              </p>
              <div className={`flex items-center gap-1 ${metric.trend === 'up' ? 'text-[#57CC99]' : 'text-red-500'}`}>
                {metric.trend === 'up' ? <TrendingUpIcon className="w-4 h-4" /> : <TrendingDownIcon className="w-4 h-4" />}
                <span className="text-sm font-medium">{metric.change}</span>
              </div>
            </div>
          </div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Monthly Patient Trend
            </h2>
            <div className="space-y-4">
              {monthlyData.map(data => <div key={data.month}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {data.month}
                  </span>
                  <span className="text-sm text-gray-600">
                    {data.patients.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[#38A3A5] h-2 rounded-full" style={{
                    width: `${data.patients / 5000 * 100}%`
                  }} />
                </div>
              </div>)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Top Performing Clinics
            </h2>
            <div className="space-y-4">
              {[{
                name: 'Galle Mobile Clinic',
                patients: 1250,
                rating: 4.8
              }, {
                name: 'Matara Mobile Clinic',
                patients: 1150,
                rating: 4.7
              }, {
                name: 'Hambantota Mobile Clinic',
                patients: 980,
                rating: 4.6
              }, {
                name: 'Colombo Mobile Clinic',
                patients: 890,
                rating: 4.5
              }].map((clinic, index) => <div key={clinic.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#38A3A5] rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {clinic.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {clinic.patients} patients
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium text-gray-900">
                      {clinic.rating}
                    </span>
                  </div>
                </div>
              </div>)}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Service Distribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{
              service: 'General Consultation',
              percentage: 45,
              count: 12500
            }, {
              service: 'Lab Tests',
              percentage: 30,
              count: 8300
            }, {
              service: 'Vaccinations',
              percentage: 25,
              count: 6900
            }].map(item => <div key={item.service} className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                  <circle cx="64" cy="64" r="56" stroke="#38A3A5" strokeWidth="12" fill="none" strokeDasharray={`${item.percentage / 100 * 351.86} 351.86`} />
                </svg>
                <div className="absolute text-2xl font-bold text-gray-900">
                  {item.percentage}%
                </div>
              </div>
              <p className="font-medium text-gray-900 mb-1">
                {item.service}
              </p>
              <p className="text-sm text-gray-600">
                {item.count.toLocaleString()} visits
              </p>
            </div>)}
          </div>
        </div>
      </main>
    </div>
  </div>;
}