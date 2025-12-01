import { useState } from 'react';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { SearchIcon, EyeIcon, FileTextIcon } from 'lucide-react';
export function Records() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const patients = [{
    id: 1,
    name: 'Kumari Jayawardena',
    nic: '905678123V',
    age: 35,
    bloodType: 'O+',
    lastVisit: '2024-01-15',
    condition: 'Hypertension',
    recordsCount: 8
  }, {
    id: 2,
    name: 'Nimal Perera',
    nic: '876543210V',
    age: 52,
    bloodType: 'A+',
    lastVisit: '2024-01-10',
    condition: 'Diabetes Type 2',
    recordsCount: 15
  }, {
    id: 3,
    name: 'Sunil Silva',
    nic: '923456789V',
    age: 28,
    bloodType: 'B+',
    lastVisit: '2024-01-08',
    condition: 'Asthma',
    recordsCount: 5
  }, {
    id: 4,
    name: 'Priya Fernando',
    nic: '945678901V',
    age: 41,
    bloodType: 'AB+',
    lastVisit: '2023-12-20',
    condition: 'Arthritis',
    recordsCount: 12
  }];
  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">
              Dashboard / Patient Records
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Patient Records
            </h1>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by name, NIC, or condition..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
              </div>
              <button className="px-6 py-2 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
                Search
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {patients.map(patient => <div key={patient.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#38A3A5] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {patient.name}
                      </h3>
                      <p className="text-sm text-gray-600">{patient.nic}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                    <FileTextIcon className="w-5 h-5 text-[#38A3A5]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Age</p>
                    <p className="font-medium text-gray-900">
                      {patient.age} years
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Blood Type</p>
                    <p className="font-medium text-gray-900">
                      {patient.bloodType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Last Visit</p>
                    <p className="font-medium text-gray-900">
                      {patient.lastVisit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Records</p>
                    <p className="font-medium text-gray-900">
                      {patient.recordsCount} visits
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-1">
                    Primary Condition
                  </p>
                  <span className="inline-block px-3 py-1 bg-[#38A3A5] bg-opacity-10 text-[#38A3A5] rounded-full text-sm font-medium">
                    {patient.condition}
                  </span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#38A3A5] text-[#38A3A5] rounded-lg font-medium hover:bg-[#38A3A5] hover:text-white transition-colors">
                  <EyeIcon className="w-4 h-4" />
                  View Full Record
                </button>
              </div>)}
          </div>
        </main>
      </div>
    </div>;
}