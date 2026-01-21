import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ClipboardListIcon, FileTextIcon, UserIcon, BarChartIcon } from 'lucide-react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { StatsCounter } from '../components/landing/StatsCounter';
export function LandingPage() {
  const navigate = useNavigate();
  const services = [{
    icon: ClipboardListIcon,
    title: 'Queue Management',
    description: 'Efficient patient queue system for mobile clinics with real-time updates and notifications. Reduce waiting times and improve patient flow with our smart scheduling system.'
  }, {
    icon: FileTextIcon,
    title: 'Patient Records',
    description: 'Secure digital health records accessible across all mobile clinic locations. Maintain comprehensive medical history, prescriptions, and lab results in one centralized system.'
  }, {
    icon: UserIcon,
    title: 'Doctor Portal',
    description: 'Comprehensive tools for doctors to manage consultations and prescriptions. Access patient information, create treatment plans, and generate prescriptions seamlessly.'
  }, {
    icon: BarChartIcon,
    title: 'Admin Analytics',
    description: 'Regional analytics and reports for data-driven healthcare decisions. Monitor clinic performance, track patient demographics, and optimize resource allocation with powerful insights.'
  }];
  return <div className="min-h-screen bg-white">
      <LandingHeader />
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Bringing healthcare closer to rural communities
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              A comprehensive patient management system for mobile clinics under
              the Ministry of Health Sri Lanka
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/role-selection')} 
                className="bg-[#38A3A5] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#2d8284] transition-colors flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/login')} 
                className="border-2 border-[#38A3A5] text-[#38A3A5] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#38A3A5] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* About Section */}
      <section id="about" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              About Arogya
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Arogya is a comprehensive healthcare management system designed specifically for mobile clinics serving rural communities across Sri Lanka. Developed under the Ministry of Health Sri Lanka initiative, our platform bridges the gap between healthcare providers and underserved populations.
            </p>
            <p className="text-lg text-gray-600">
              Our mission is to modernize healthcare delivery in remote areas by providing efficient queue management, secure digital health records, and seamless communication between patients and healthcare professionals. We empower healthcare workers with cutting-edge technology while keeping patient care at the heart of everything we do.
            </p>
          </div>
        </div>
      </section>
      {/* Services Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map(service => <div key={service.title} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-[#38A3A5]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600">{service.description}</p>
              </div>)}
          </div>
        </div>
      </section>
      {/* Statistics Section */}
      <StatsCounter />
      <LandingFooter />
    </div>;
}