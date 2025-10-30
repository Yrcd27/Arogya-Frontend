import React, { useState } from 'react';
import { DoctorSidebar } from '../components/DoctorSidebar';
import { DoctorHeader } from '../components/DoctorHeader';
import { SearchIcon, EyeIcon } from 'lucide-react';
export function DoctorQueue() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queuePatients = [{
    id: 1,
    queueNumber: 1,
    name: 'Kumari Jayawardena',
    nic: '905678123V',
    age: 35,
    time: '10:00 AM',
    status: 'Waiting',
    priority: 'Normal'
  }, {
    id: 2,
    queueNumber: 2,
    name: 'Nimal Perera',
    nic: '876543210V',
    age: 52,
    time: '10:15 AM',
    status: 'Waiting',
    priority: 'Normal'
  }, {
    id: 3,
    queueNumber: 3,
    name: 'Sunil Silva',
    nic: '923456789V',
    age: 28,
    time: '10:30 AM',
    status: 'Waiting',
    priority: 'Urgent'
  }, {
    id: 4,
    queueNumber: 4,
    name: 'Priya Fernando',
    nic: '945678901V',
    age: 41,
    time: '10:45 AM',
    status: 'Waiting',
    priority: 'Normal'
  }, {
    id: 5,
    queueNumber: 5,
    name: 'Ravi Wickramasinghe',
    nic: '887654321V',
    age: 67,
    time: '11:00 AM',
    status: 'Waiting',
    priority: 'Normal'
  }];
  return <div className="flex min-h-screen bg-gray-50">
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <DoctorHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">
              Dashboard / Patient Queue
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Patient Queue</h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by name or NIC..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
              </div>
              <button className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
                Search
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Queue #
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Patient Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      NIC
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Age
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Priority
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {queuePatients.map(patient => <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 bg-[#38A3A5] text-white rounded-full flex items-center justify-center font-semibold">
                          {patient.queueNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {patient.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {patient.nic}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {patient.age}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {patient.time}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${patient.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {patient.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#38A3A5] bg-opacity-20 text-[#38A3A5] rounded-full text-xs font-medium">
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="px-4 py-2 bg-[#38A3A5] text-white rounded-lg text-sm font-medium hover:bg-[#2d8284] transition-colors">
                          Consult
                        </button>
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