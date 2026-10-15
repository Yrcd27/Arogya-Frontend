import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HospitalIcon, FileTextIcon, FlaskConicalIcon, UserIcon, ArrowRightIcon } from 'lucide-react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { PatientCard } from '../../components/patient/PatientCard';
import { SummaryCards } from '../../components/patient/SummaryCards';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  const quickNav = [
    {
      to: '/patient/clinics',
      title: 'Mobile Clinics & Appointments',
      desc: 'Browse schedule and join clinic queue',
      icon: HospitalIcon,
      action: 'Book Appointment'
    },
    {
      to: '/patient/records',
      title: 'Prescriptions',
      desc: 'View medical consultations and prescriptions',
      icon: FileTextIcon,
      action: 'View Prescriptions'
    },
    {
      to: '/patient/lab-results',
      title: 'Lab Results',
      desc: 'Check diagnostic test status and reports',
      icon: FlaskConicalIcon,
      action: 'View Lab Results'
    },
    {
      to: '/patient/profile',
      title: 'My Profile',
      desc: 'Update personal info and medical history',
      icon: UserIcon,
      action: 'Manage Profile'
    }
  ];

  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-1">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Patient Dashboard
            </h1>
          </div>
          <PatientCard />
          <SummaryCards />

          {/* Quick Access Services Navigation */}
          <section className="mt-6 sm:mt-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
              Patient Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickNav.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col justify-between p-4 sm:p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#38a3a5] hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#38a3a5]/10 text-[#38a3a5] flex items-center justify-center mb-3 group-hover:bg-[#38a3a5] group-hover:text-white transition-colors">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      {item.desc}
                    </p>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-[#38a3a5] group-hover:translate-x-1 transition-transform">
                    <span>{item.action}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>;
}
