import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, ShieldIcon, WrenchIcon, HeartHandshakeIcon } from 'lucide-react';

interface RoleOption {
  id: number;
  name: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
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
      color: 'bg-blue-500 hover:bg-blue-600',
      requiresSecret: false,
    },
    {
      id: 1,
      name: 'doctor',
      displayName: 'Doctor',
      description: 'Join as a medical professional to manage patients and consultations',
      icon: HeartHandshakeIcon,
      color: 'bg-green-500 hover:bg-green-600',
      requiresSecret: true,
    },
    {
      id: 4,
      name: 'admin',
      displayName: 'Administrator',
      description: 'System administration access for managing the healthcare platform',
      icon: ShieldIcon,
      color: 'bg-red-500 hover:bg-red-600',
      requiresSecret: true,
    },
    {
      id: 5,
      name: 'technician',
      displayName: 'Technician',
      description: 'Register as a medical technician to manage equipment and lab services',
      icon: WrenchIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-[#38A3A5] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Role
          </h1>
          <p className="text-xl text-gray-600">
            Select your role to get started with Arogya Healthcare System
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <div
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <div className={`w-16 h-16 ${role.color} rounded-lg flex items-center justify-center mb-4 mx-auto`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                  {role.displayName}
                </h3>
                
                <p className="text-gray-600 text-center text-sm mb-4">
                  {role.description}
                </p>

                {role.requiresSecret && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-4">
                    <p className="text-yellow-800 text-xs text-center">
                      <span className="font-semibold">⚠️ Secret Key Required</span>
                    </p>
                  </div>
                )}

                <button className={`w-full ${role.color} text-white py-3 rounded-lg font-semibold transition-colors`}>
                  Register as {role.displayName}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')} 
              className="text-[#38A3A5] font-semibold hover:underline"
            >
              Sign In
            </button>
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}