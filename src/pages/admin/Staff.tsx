import { useState } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { SearchIcon, PlusIcon, MailIcon, PhoneIcon, EditIcon, TrashIcon } from 'lucide-react';
export function Staff() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const staff = [{
    id: 1,
    name: 'Dr. Rajapaksa',
    role: 'Senior Doctor',
    email: 'rajapaksa@health.gov.lk',
    phone: '+94 77 123 4567',
    specialization: 'General Medicine',
    clinics: 24,
    status: 'Active'
  }, {
    id: 2,
    name: 'Dr. Fernando',
    role: 'Doctor',
    email: 'fernando@health.gov.lk',
    phone: '+94 77 234 5678',
    specialization: 'Pediatrics',
    clinics: 18,
    status: 'Active'
  }, {
    id: 3,
    name: 'Dr. Silva',
    role: 'Doctor',
    email: 'silva@health.gov.lk',
    phone: '+94 77 345 6789',
    specialization: 'Internal Medicine',
    clinics: 21,
    status: 'Active'
  }, {
    id: 4,
    name: 'Nurse Perera',
    role: 'Senior Nurse',
    email: 'perera@health.gov.lk',
    phone: '+94 77 456 7890',
    specialization: 'Emergency Care',
    clinics: 32,
    status: 'Active'
  }, {
    id: 5,
    name: 'Admin Jayawardena',
    role: 'Administrator',
    email: 'jayawardena@health.gov.lk',
    phone: '+94 77 567 8901',
    specialization: 'Healthcare Admin',
    clinics: 0,
    status: 'Active'
  }];
  return <div className="min-h-screen bg-gray-50">
    <Sidebar
      isOpen={isSidebarOpen}
      onClose={() => setIsSidebarOpen(false)}
    />
    <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600 text-sm mb-1">Dashboard / Staff</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Staff Management
            </h1>
          </div>
          <button className="flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors text-sm lg:text-base">
            <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5" />
            Add Staff Member
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by name, role, or specialization..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
              <option>All Roles</option>
              <option>Doctor</option>
              <option>Nurse</option>
              <option>Administrator</option>
            </select>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Staff Member
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Specialization
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Clinics
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
                {staff.map(member => <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#38A3A5] rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      {member.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MailIcon className="w-4 h-4" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4" />
                        <span>{member.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      {member.specialization}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      {member.clinics}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="px-3 py-1 bg-[#57CC99] bg-opacity-20 text-[#57CC99] rounded-full text-xs font-medium">
                        {member.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 text-[#38A3A5] hover:bg-[#38A3A5] hover:bg-opacity-10 rounded-lg transition-colors">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <TrashIcon className="w-4 h-4" />
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