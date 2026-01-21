import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, WrenchIcon, HeartHandshakeIcon } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-6xl w-full">
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
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 text-sm inline-flex items-center gap-1"
          >
            <span>←</span> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}