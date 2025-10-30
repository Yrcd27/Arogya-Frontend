import React from 'react';
export function PatientCard() {
  return <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
        <div className="w-20 h-20 bg-[#38a3a5] rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          KJ
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Kumari Jayawardena
          </h2>
          <div className="flex flex-wrap gap-6 text-gray-600">
            <div>
              <span className="font-medium">NIC:</span> 905678123V
            </div>
            <div>
              <span className="font-medium">Age:</span> 35
            </div>
            <div>
              <span className="font-medium">Blood Type:</span> O+
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button className="px-6 py-3 text-[#38a3a5] border-2 border-[#38a3a5] rounded-lg font-medium hover:bg-[#38a3a5] hover:text-white transition-colors">
            Update Info
          </button>
          <button className="px-6 py-3 bg-[#38a3a5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
            Book Appointment
          </button>
        </div>
      </div>
    </div>;
}