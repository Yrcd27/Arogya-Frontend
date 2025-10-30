import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { CalendarIcon, ClockIcon, MapPinIcon, PlusIcon } from 'lucide-react';
export function Appointments() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const appointments = [{
    id: 1,
    date: '2024-06-20',
    time: '10:00 AM',
    doctor: 'Dr. Perera',
    clinic: 'Galle Mobile Clinic',
    location: 'Galle District Hospital',
    status: 'Upcoming'
  }, {
    id: 2,
    date: '2024-05-15',
    time: '2:30 PM',
    doctor: 'Dr. Silva',
    clinic: 'Matara Mobile Clinic',
    location: 'Matara Community Center',
    status: 'Completed'
  }];
  return <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-2">
                Dashboard / Appointments
              </p>
              <h1 className="text-3xl font-bold text-gray-900">
                My Appointments
              </h1>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
              <PlusIcon className="w-5 h-5" />
              Book Appointment
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {appointments.map(appointment => <div key={appointment.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-[#38A3A5]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {appointment.doctor}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.clinic}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${appointment.status === 'Upcoming' ? 'bg-[#38A3A5] bg-opacity-20 text-[#38A3A5]' : 'bg-gray-200 text-gray-600'}`}>
                    {appointment.status}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm">{appointment.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-sm">{appointment.time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPinIcon className="w-4 h-4" />
                    <span className="text-sm">{appointment.location}</span>
                  </div>
                </div>
                {appointment.status === 'Upcoming' && <div className="mt-6 flex gap-3">
                    <button className="flex-1 px-4 py-2 border-2 border-[#38A3A5] text-[#38A3A5] rounded-lg font-medium hover:bg-[#38A3A5] hover:text-white transition-colors">
                      Reschedule
                    </button>
                    <button className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">
                      Cancel
                    </button>
                  </div>}
              </div>)}
          </div>
        </main>
      </div>
    </div>;
}