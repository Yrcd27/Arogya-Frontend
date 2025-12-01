import { useState } from 'react';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { SearchIcon, FlaskConicalIcon, EyeIcon, DownloadIcon, PlusIcon } from 'lucide-react';
export function LabResults() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">
                Dashboard / Lab Results
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Laboratory Results
              </h1>
            </div>
            <button className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors text-sm sm:text-base">
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Request Test</span>
              <span className="sm:hidden">Request</span>
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by patient name, NIC, or test..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-sm" />
              </div>
              <select className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-sm min-w-[120px]">
                <option>All Status</option>
                <option>Ready</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Test Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Clinic
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Results
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {labResults.map(result => <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {result.patientName}
                            </p>
                            <p className="text-xs text-gray-500">{result.nic}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FlaskConicalIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#38A3A5]" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {result.testName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600">{result.date}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600">{result.clinic}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${result.results === 'Normal' ? 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]' : result.results === 'Pending' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'}`}>
                            {result.results}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${result.status === 'Ready' ? 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]' : 'bg-gray-200 text-gray-600'}`}>
                            {result.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button className="p-1.5 sm:p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {result.status === 'Ready' && <button className="p-1.5 sm:p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
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