import React, { useState } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { DownloadIcon, EyeIcon } from 'lucide-react';
export function Records() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const records = [{
    id: 1,
    date: '2024-01-15',
    type: 'General Checkup',
    doctor: 'Dr. Perera',
    clinic: 'Galle Mobile Clinic',
    status: 'Completed'
  }, {
    id: 2,
    date: '2023-12-10',
    type: 'Follow-up',
    doctor: 'Dr. Silva',
    clinic: 'Matara Mobile Clinic',
    status: 'Completed'
  }, {
    id: 3,
    date: '2023-11-05',
    type: 'Vaccination',
    doctor: 'Dr. Fernando',
    clinic: 'Hambantota Mobile Clinic',
    status: 'Completed'
  }];
  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="lg:ml-64 flex flex-col">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / My Records</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Medical Records
            </h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <input type="text" placeholder="Search records..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
                <button className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
                  Search
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Doctor
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Clinic
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map(record => <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.doctor}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.clinic}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#57CC99] bg-opacity-20 text-[#57CC99] rounded-full text-xs font-medium">
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>;
}