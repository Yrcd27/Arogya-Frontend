import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { FlaskConicalIcon, DownloadIcon, EyeIcon } from 'lucide-react';
export function LabResults() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const results = [{
    id: 1,
    date: '2024-01-15',
    testName: 'Complete Blood Count',
    status: 'Ready',
    clinic: 'Galle Mobile Clinic'
  }, {
    id: 2,
    date: '2024-01-10',
    testName: 'Blood Sugar Test',
    status: 'Ready',
    clinic: 'Matara Mobile Clinic'
  }, {
    id: 3,
    date: '2023-12-20',
    testName: 'Lipid Profile',
    status: 'Ready',
    clinic: 'Hambantota Mobile Clinic'
  }];
  return <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">
              Dashboard / Lab Results
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Laboratory Results
            </h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Test Name
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
                  {results.map(result => <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {result.date}
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
                        {result.clinic}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#57CC99] bg-opacity-20 text-[#57CC99] rounded-full text-xs font-medium">
                          {result.status}
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