import React, { useState } from 'react';
import { DoctorSidebar } from '../components/DoctorSidebar';
import { DoctorHeader } from '../components/DoctorHeader';
import { SearchIcon, FlaskConicalIcon, EyeIcon, DownloadIcon, PlusIcon } from 'lucide-react';
export function DoctorLabResults() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const labResults = [{
    id: 1,
    patientName: 'Kumari Jayawardena',
    nic: '905678123V',
    testName: 'Complete Blood Count',
    date: '2024-01-15',
    status: 'Ready',
    results: 'Normal',
    clinic: 'Galle Mobile Clinic'
  }, {
    id: 2,
    patientName: 'Nimal Perera',
    nic: '876543210V',
    testName: 'Blood Sugar (Fasting)',
    date: '2024-01-10',
    status: 'Ready',
    results: 'Elevated',
    clinic: 'Matara Mobile Clinic'
  }, {
    id: 3,
    patientName: 'Nimal Perera',
    nic: '876543210V',
    testName: 'Lipid Profile',
    date: '2024-01-10',
    status: 'Ready',
    results: 'Abnormal',
    clinic: 'Matara Mobile Clinic'
  }, {
    id: 4,
    patientName: 'Sunil Silva',
    nic: '923456789V',
    testName: 'Chest X-Ray',
    date: '2024-01-08',
    status: 'Pending',
    results: 'Pending',
    clinic: 'Hambantota Mobile Clinic'
  }, {
    id: 5,
    patientName: 'Priya Fernando',
    nic: '945678901V',
    testName: 'Urine Analysis',
    date: '2023-12-20',
    status: 'Ready',
    results: 'Normal',
    clinic: 'Galle Mobile Clinic'
  }];
  return <div className="flex min-h-screen bg-gray-50">
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <DoctorHeader onMenuClick={() => setIsSidebarOpen(true)} showAddPatient={false} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">
                Dashboard / Lab Results
              </p>
              <h1 className="text-3xl font-bold text-gray-900">
                Laboratory Results
              </h1>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
              <PlusIcon className="w-5 h-5" />
              Request Test
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by patient name, NIC, or test..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
                <option>All Status</option>
                <option>Ready</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Test Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Clinic
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Results
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
                  {labResults.map(result => <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {result.patientName}
                          </p>
                          <p className="text-xs text-gray-600">{result.nic}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                            <FlaskConicalIcon className="w-5 h-5 text-[#38A3A5]" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {result.testName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {result.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {result.clinic}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${result.results === 'Normal' ? 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]' : result.results === 'Pending' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'}`}>
                          {result.results}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${result.status === 'Ready' ? 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]' : 'bg-gray-200 text-gray-600'}`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {result.status === 'Ready' && <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                              <DownloadIcon className="w-4 h-4" />
                            </button>}
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