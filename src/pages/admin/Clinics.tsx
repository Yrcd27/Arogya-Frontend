import { useState } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { SearchIcon, PlusIcon, MapPinIcon, CalendarIcon, UsersIcon, EditIcon, TrashIcon } from 'lucide-react';

export function Clinics() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const clinics = [{
    id: 1,
    name: 'Galle Mobile Clinic',
    location: 'Galle District',
    date: '2024-06-15',
    time: '09:00 AM',
    doctor: 'Dr. Rajapaksa',
    capacity: 50,
    registered: 45,
    status: 'Scheduled'
  }, {
    id: 2,
    name: 'Matara Mobile Clinic',
    location: 'Matara District',
    date: '2024-06-16',
    time: '10:00 AM',
    doctor: 'Dr. Fernando',
    capacity: 40,
    registered: 38,
    status: 'Scheduled'
  }, {
    id: 3,
    name: 'Hambantota Mobile Clinic',
    location: 'Hambantota District',
    date: '2024-06-14',
    time: '08:00 AM',
    doctor: 'Dr. Silva',
    capacity: 45,
    registered: 45,
    status: 'In Progress'
  }, {
    id: 4,
    name: 'Colombo Mobile Clinic',
    location: 'Colombo District',
    date: '2024-06-13',
    time: '09:30 AM',
    doctor: 'Dr. Perera',
    capacity: 60,
    registered: 58,
    status: 'Completed'
  }];
  return <div className="min-h-screen bg-gray-50">
    <Sidebar
      isOpen={isSidebarOpen}
      onClose={() => setIsSidebarOpen(false)}
    />
    <div className="md:ml-64 flex flex-col min-h-screen">
      <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600 text-sm mb-2">Dashboard / Clinics</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Mobile Clinics
            </h1>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
            <PlusIcon className="w-5 h-5" />
            Schedule Clinic
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by clinic name or location..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
              <option>All Status</option>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clinics.map(clinic => <div key={clinic.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {clinic.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{clinic.location}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${clinic.status === 'Scheduled' ? 'bg-blue-100 text-blue-600' : clinic.status === 'In Progress' ? 'bg-[#38A3A5] bg-opacity-20 text-[#38A3A5]' : 'bg-gray-200 text-gray-600'}`}>
                {clinic.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Date & Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {clinic.date}
                  </p>
                  <p className="text-xs text-gray-600">{clinic.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Capacity</p>
                  <p className="text-sm font-medium text-gray-900">
                    {clinic.registered}/{clinic.capacity}
                  </p>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-1">Doctor Assigned</p>
              <p className="text-sm font-medium text-gray-900">
                {clinic.doctor}
              </p>
            </div>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-[#38A3A5] h-2 rounded-full" style={{
                  width: `${clinic.registered / clinic.capacity * 100}%`
                }} />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {Math.round(clinic.registered / clinic.capacity * 100)}%
                Full
              </p>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#38A3A5] text-[#38A3A5] rounded-lg font-medium hover:bg-[#38A3A5] hover:text-white transition-colors">
                <EditIcon className="w-4 h-4" />
                Edit
              </button>
              <button className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-500 hover:text-white transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>)}
        </div>
      </main>
    </div>
  </div>;
}