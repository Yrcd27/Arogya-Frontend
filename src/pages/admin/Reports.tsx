import { useState } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { FileTextIcon, DownloadIcon, CalendarIcon, FilterIcon } from 'lucide-react';

export function Reports() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const reports = [{
    id: 1,
    name: 'Monthly Patient Statistics',
    type: 'Patient Report',
    date: '2024-05-31',
    size: '2.4 MB',
    format: 'PDF'
  }, {
    id: 2,
    name: 'Clinic Performance Analysis',
    type: 'Clinic Report',
    date: '2024-05-31',
    size: '1.8 MB',
    format: 'PDF'
  }, {
    id: 3,
    name: 'Staff Attendance Report',
    type: 'Staff Report',
    date: '2024-05-31',
    size: '856 KB',
    format: 'PDF'
  }, {
    id: 4,
    name: 'Financial Summary',
    type: 'Financial Report',
    date: '2024-05-31',
    size: '1.2 MB',
    format: 'PDF'
  }, {
    id: 5,
    name: 'Medication Inventory',
    type: 'Inventory Report',
    date: '2024-06-01',
    size: '945 KB',
    format: 'Excel'
  }, {
    id: 6,
    name: 'Patient Satisfaction Survey',
    type: 'Survey Report',
    date: '2024-05-28',
    size: '3.1 MB',
    format: 'PDF'
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
          <p className="text-gray-600 text-sm mb-2">Dashboard / Reports</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Generate New Report
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
              <option>Select Report Type</option>
              <option>Patient Report</option>
              <option>Clinic Report</option>
              <option>Staff Report</option>
              <option>Financial Report</option>
              <option>Inventory Report</option>
            </select>
            <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
            <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
            <button className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
              Generate Report
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Reports
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <FilterIcon className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => <div key={report.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                <FileTextIcon className="w-6 h-6 text-[#38A3A5]" />
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                {report.format}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{report.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{report.type}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{report.date}</span>
              </div>
              <span>{report.size}</span>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
              <DownloadIcon className="w-4 h-4" />
              Download
            </button>
          </div>)}
        </div>
      </main>
    </div>
  </div>;
}