export function PatientCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-100">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#38a3a5] rounded-full flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0">
          KJ
        </div>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
            Kumari Jayawardena
          </h2>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-gray-600 text-sm sm:text-base">
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
          <button className="px-4 sm:px-6 py-2 sm:py-3 text-[#38a3a5] border-2 border-[#38a3a5] rounded-lg font-medium hover:bg-[#38a3a5] hover:text-white transition-colors text-sm sm:text-base">
            Update Info
          </button>
          <button className="px-4 sm:px-6 py-2 sm:py-3 bg-[#38a3a5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors text-sm sm:text-base">
            Book Appointment
          </button>
        </div>
      </div>
    </div>
  );
}