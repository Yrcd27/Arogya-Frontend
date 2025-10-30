import React from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { PillIcon, DownloadIcon } from 'lucide-react';
export function Prescriptions() {
  const prescriptions = [{
    id: 1,
    date: '2024-01-15',
    doctor: 'Dr. Perera',
    medications: ['Paracetamol 500mg', 'Amoxicillin 250mg'],
    duration: '7 days',
    status: 'Active'
  }, {
    id: 2,
    date: '2023-12-10',
    doctor: 'Dr. Silva',
    medications: ['Metformin 500mg'],
    duration: '30 days',
    status: 'Completed'
  }];
  return <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">
              Dashboard / Prescriptions
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              My Prescriptions
            </h1>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {prescriptions.map(prescription => <div key={prescription.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                      <PillIcon className="w-6 h-6 text-[#38A3A5]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {prescription.doctor}
                      </p>
                      <p className="text-sm text-gray-600">
                        {prescription.date}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${prescription.status === 'Active' ? 'bg-[#57CC99] bg-opacity-20 text-[#57CC99]' : 'bg-gray-200 text-gray-600'}`}>
                    {prescription.status}
                  </span>
                </div>
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Medications:
                    </p>
                    <ul className="space-y-1">
                      {prescription.medications.map((med, index) => <li key={index} className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0">
                          {med}
                        </li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Duration:{' '}
                      <span className="font-normal text-gray-600">
                        {prescription.duration}
                      </span>
                    </p>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#38A3A5] text-[#38A3A5] rounded-lg font-medium hover:bg-[#38A3A5] hover:text-white transition-colors">
                  <DownloadIcon className="w-4 h-4" />
                  Download Prescription
                </button>
              </div>)}
          </div>
        </main>
      </div>
    </div>;
}