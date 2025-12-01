import { useState } from 'react';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { SearchIcon, PlusIcon, EyeIcon, EditIcon } from 'lucide-react';
export function Prescriptions() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const prescriptions = [{
    id: 1,
    patientName: 'Kumari Jayawardena',
    nic: '905678123V',
    date: '2024-01-15',
    medications: ['Paracetamol 500mg - 3x daily', 'Amoxicillin 250mg - 2x daily'],
    duration: '7 days',
    status: 'Active',
    diagnosis: 'Upper Respiratory Infection'
  }, {
    id: 2,
    patientName: 'Nimal Perera',
    nic: '876543210V',
    date: '2024-01-10',
    medications: ['Metformin 500mg - 2x daily', 'Atorvastatin 10mg - 1x daily'],
    duration: '30 days',
    status: 'Active',
    diagnosis: 'Diabetes Type 2, Hyperlipidemia'
  }, {
    id: 3,
    patientName: 'Sunil Silva',
    nic: '923456789V',
    date: '2024-01-08',
    medications: ['Salbutamol Inhaler - As needed'],
    duration: '90 days',
    status: 'Active',
    diagnosis: 'Asthma'
  }, {
    id: 4,
    patientName: 'Priya Fernando',
    nic: '945678901V',
    date: '2023-12-20',
    medications: ['Ibuprofen 400mg - 3x daily'],
    duration: '14 days',
    status: 'Completed',
    diagnosis: 'Arthritis Pain'
  }];
  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="lg:ml-64 flex flex-col">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} showAddPatient={false} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">
                Dashboard / Prescriptions
              </p>
              <h1 className="text-3xl font-bold text-gray-900">
                Prescriptions
              </h1>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
              <PlusIcon className="w-5 h-5" />
              New Prescription
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search by patient name or NIC..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
                <option>All Status</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {prescriptions.map(prescription => <div key={prescription.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {prescription.patientName}
                    </h3>
                    <p className="text-sm text-gray-600">{prescription.nic}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${prescription.status === 'Active' ? 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]' : 'bg-gray-200 text-gray-600'}`}>
                      {prescription.status}
                    </span>
                    <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    {prescription.status === 'Active' && <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                        <EditIcon className="w-4 h-4" />
                      </button>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      Date Prescribed
                    </p>
                    <p className="font-medium text-gray-900">
                      {prescription.date}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Duration</p>
                    <p className="font-medium text-gray-900">
                      {prescription.duration}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Diagnosis</p>
                  <p className="text-sm font-medium text-gray-900">
                    {prescription.diagnosis}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-2">Medications</p>
                  <ul className="space-y-2">
                    {prescription.medications.map((med, index) => <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-[#38A3A5] mt-1">•</span>
                        <span>{med}</span>
                      </li>)}
                  </ul>
                </div>
              </div>)}
          </div>
        </main>
      </div>
    </div>;
}