import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ClipboardListIcon, FileTextIcon, UserIcon, BarChartIcon, HeartHandshakeIcon, ArrowRightCircleIcon, MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { HeroCarousel } from '../components/landing/HeroCarousel';
const OFFICE_ADDRESS = 'Suwasiripaya, No. 385, Rev. Baddegama Wimalawansa Thero Mawatha, Colombo 10, Sri Lanka';
const OFFICE_MAP_QUERY = encodeURIComponent(OFFICE_ADDRESS);
const OFFICE_MAP_EMBED_URL = `https://www.google.com/maps?q=${OFFICE_MAP_QUERY}&output=embed`;
const OFFICE_MAP_VIEW_URL = `https://www.google.com/maps/search/?api=1&query=${OFFICE_MAP_QUERY}`;

export function LandingPage() {
  const navigate = useNavigate();
  const services = [{
    icon: ClipboardListIcon,
    title: 'Queue Management',
    description: 'Manage patient queues efficiently with real-time updates and smoother clinic flow.'
  }, {
    icon: FileTextIcon,
    title: 'Patient Records',
    description: 'Securely manage patient health records, medical history, prescriptions and clinical information.'
  }, {
    icon: UserIcon,
    title: 'Doctor Portal',
    description: 'Access patient information, manage consultations, treatment plans and prescriptions in one place.'
  }, {
    icon: BarChartIcon,
    title: 'Admin Analytics',
    description: 'Monitor clinic activity, patient trends and operational data through clear reports and insights.'
  }];
  return <div className="min-h-screen bg-white">
      <LandingHeader />
      {/* Hero Section */}
      <section id="home" className="relative isolate min-h-screen flex flex-col overflow-hidden bg-[#141f30]">
        <HeroCarousel />
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 lg:px-10 pt-32 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-3xl">
              <h1 className="text-[clamp(2.25rem,1.1rem+3.2vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-white mb-6 max-w-3xl">
                Bringing healthcare closer to rural communities
              </h1>
              <p className="text-lg md:text-xl text-gray-100/90 leading-relaxed max-w-xl mb-10">
                A comprehensive patient management system for mobile clinics under
                the Ministry of Health Sri Lanka
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/role-selection')}
                  className="group bg-[#38A3A5] text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:shadow-xl hover:bg-[#2d8284] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Get Started
                  <ArrowRightIcon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
                <a
                  href="#services"
                  className="border-2 border-white/70 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 hover:border-white transition-all duration-200 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Our Services
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* About Section */}
      <section id="about" className="py-16 md:py-20 px-6 bg-white scroll-mt-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 md:mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              About Arogya
            </h2>
            <p className="text-base text-gray-500 max-w-2xl mx-auto">
              Bringing comprehensive healthcare closer to communities across Sri Lanka.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-7 items-stretch">
            {/* Program Vision — a compact statement panel */}
            <div className="bg-[#38A3A5]/[0.06] rounded-2xl p-7 lg:p-8 animate-fade-in-up animate-delay-100">
              <div className="flex items-center gap-2 mb-4">
                <HeartHandshakeIcon className="w-5 h-5 text-[#38A3A5]" />
                <span className="text-xs font-semibold tracking-wider text-[#2d8284] uppercase">
                  Program Vision
                </span>
              </div>
              <p className="text-lg md:text-xl font-medium text-gray-900 leading-snug">
                Building a healthier Sri Lanka by bringing accessible healthcare closer to people and communities, reducing barriers to care and supporting better physical and mental wellbeing.
              </p>
            </div>

            {/* Program Mission — same panel treatment, lighter explanatory tone */}
            <div className="bg-[#38A3A5]/[0.06] rounded-2xl p-7 lg:p-8 animate-fade-in-up animate-delay-200">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightCircleIcon className="w-5 h-5 text-[#38A3A5]" />
                <span className="text-xs font-semibold tracking-wider text-[#2d8284] uppercase">
                  Program Mission
                </span>
              </div>
              <p className="text-base md:text-lg font-normal text-gray-600 leading-relaxed">
                Delivering accessible, comprehensive and preventive healthcare through mobile clinics, including health screening, essential care, wellbeing support and referrals for further treatment.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Services Section */}
      <section id="services" className="py-20 px-6 bg-white scroll-mt-28">
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
      {/* Contact Section */}
      <section id="contact" className="py-[70px] md:py-[88px] px-6 bg-white scroll-mt-28">
        <div className="max-w-2xl mx-auto text-center mb-10 md:mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Contact &amp; Support
          </h2>
          <p className="text-base text-gray-500">
            For general information and support related to Arogya services, contact the Ministry of Health through the official channels below.
          </p>
        </div>
        <div className="max-w-[1100px] mx-auto bg-[#38A3A5]/[0.05] border border-[#38A3A5]/10 rounded-2xl p-6 md:p-8">
          <div className="grid md:grid-cols-[2fr_3fr] gap-8 items-stretch">
            {/* Contact information */}
            <div className="flex flex-col justify-center gap-6">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 bg-[#38A3A5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MailIcon className="w-5 h-5 text-[#38A3A5]" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1">Email</h3>
                  <a
                    href="mailto:info@health.gov.lk"
                    className="text-gray-900 font-semibold hover:text-[#38A3A5] transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
                  >
                    info@health.gov.lk
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 bg-[#38A3A5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PhoneIcon className="w-5 h-5 text-[#38A3A5]" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1">Phone</h3>
                  <a
                    href="tel:+94112694033"
                    className="text-gray-900 font-semibold hover:text-[#38A3A5] transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
                  >
                    +94 11 269 4033
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 bg-[#38A3A5]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="w-5 h-5 text-[#38A3A5]" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-1">Address</h3>
                  <p className="text-gray-900 text-sm font-medium leading-relaxed max-w-[280px]">
                    {OFFICE_ADDRESS}
                  </p>
                  <a
                    href={OFFICE_MAP_VIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-[#38A3A5] hover:text-[#2d8284] transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
                  >
                    View on Map
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Location map */}
            <div className="rounded-2xl overflow-hidden h-[260px] md:h-[340px]">
              <iframe
                title="Ministry of Health Sri Lanka location"
                src={OFFICE_MAP_EMBED_URL}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </div>;
}