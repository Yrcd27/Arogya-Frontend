import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, WrenchIcon, HeartHandshakeIcon, HomeIcon } from 'lucide-react';

interface RoleOption {
  id: number;
  name: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresSecret: boolean;
}

export function RoleSelection() {
  const navigate = useNavigate();

  const roles: RoleOption[] = [
    {
      id: 2,
      name: 'patient',
      displayName: 'Patient',
      description: 'Register as a patient to book appointments and access medical records',
      icon: UserIcon,
      requiresSecret: false,
    },
    {
      id: 1,
      name: 'doctor',
      displayName: 'Doctor',
      description: 'Join as a medical professional to manage patients, consultations and prescriptions',
      icon: HeartHandshakeIcon,
      requiresSecret: true,
    },
    {
      id: 4,
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administration access for managing the healthcare platform and clinics',
      icon: ShieldIcon,
      requiresSecret: true,
    },
    {
      id: 5,
      name: 'technician',
      displayName: 'Technician',
      description: 'Register as a medical technician to manage equipments, lab services and reports',
      icon: WrenchIcon,
      requiresSecret: true,
    },
  ];

  const handleRoleSelect = (role: RoleOption) => {
    navigate(`/register/${role.name}`, {
      state: {
        roleData: {
          id: role.id,
          roleName: role.displayName.toUpperCase(),
          roleDescription: role.description,
          requiresSecret: role.requiresSecret,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 py-12 relative">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Go to home"
        className="hidden md:flex group absolute top-7 left-8 z-10 items-center w-11 hover:w-28 focus-visible:w-28 h-11 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(15,28,43,0.06)] transition-[width,background-color] duration-[220ms] ease hover:bg-[#38A3A5]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-[#38A3A5]">
          <HomeIcon className="w-5 h-5" />
        </span>
        <span className="whitespace-nowrap pr-4 text-sm font-medium text-[#111827] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
          Home
        </span>
      </button>
      <div className="max-w-6xl w-full">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Go to home"
          className="md:hidden inline-flex items-center gap-2 h-10 px-4 mb-6 rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(15,28,43,0.06)] text-sm font-medium text-[#111827] hover:bg-[#38A3A5]/10 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
        >
          <HomeIcon className="w-4 h-4 text-[#38A3A5]" />
          Home
        </button>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Choose Your Role
          </h1>
          <p className="text-base text-gray-600">
            Select your role to get started with Arogya Healthcare System
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className="bg-white rounded-lg shadow border border-gray-200 p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#38A3A5]"
              >
                <div className="w-14 h-14 bg-[#38A3A5] rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <IconComponent className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                  {role.displayName}
                </h3>

                <p className="text-gray-600 text-center text-sm mb-4 leading-relaxed">
                  {role.description}
                </p>

                <button className="w-full bg-[#38A3A5] text-white py-2.5 rounded-lg font-medium transition-colors hover:bg-[#2d8284]">
                  Register as {role.displayName}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-3">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#38A3A5] font-semibold hover:text-[#2d8284]"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}