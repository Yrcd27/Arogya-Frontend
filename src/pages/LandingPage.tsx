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
      <section className="bg-gradient-to-br from-gray-50 to-white py-20 px-6 animate-fade-in-up">
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
      <section id="about" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
              About Arogya
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 animate-fade-in-up animate-delay-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#38A3A5] bg-opacity-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-[#38A3A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
              </div>
              <p className="text-gray-600 leading-relaxed text-lg">
                Arogya is a comprehensive healthcare management system designed specifically for mobile clinics serving rural communities across Sri Lanka. Developed under the Ministry of Health Sri Lanka initiative, our platform bridges the gap between healthcare providers and underserved populations.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 animate-fade-in-up animate-delay-200">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#38A3A5] bg-opacity-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-[#38A3A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
              </div>
              <p className="text-gray-600 leading-relaxed text-lg">
                We empower healthcare workers with cutting-edge technology while keeping patient care at the heart of everything we do. Our vision is to modernize healthcare delivery in remote areas through efficient queue management, secure digital health records, and seamless communication.
              </p>
            </div>
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
            {services.map((service, index) => <div key={service.title} className={`bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-2 animate-fade-in-up animate-delay-${index + 1}00`}>
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
      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Contact Us
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Have questions or need support? We're here to help you provide better healthcare services to rural communities.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6 animate-fade-in-up animate-delay-100 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-[#38A3A5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#38A3A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">support@arogya.health.gov.lk</p>
            </div>
            <div className="text-center p-6 animate-fade-in-up animate-delay-200 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-[#38A3A5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#38A3A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">+94 11 269 1111</p>
            </div>
            <div className="text-center p-6 animate-fade-in-up animate-delay-300 hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-[#38A3A5] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#38A3A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600">Ministry of Health, Suwasiripaya</p>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </div>;
}