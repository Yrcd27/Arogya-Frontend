import React from 'react';
import { GlobeIcon, BellIcon, ChevronDownIcon } from 'lucide-react';

export function Header() {
  return <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
            <GlobeIcon className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">English</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <BellIcon className="w-6 h-6 text-gray-600" />
          </button>
          <button className="flex items-center gap-3 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
            <div className="w-10 h-10 bg-[#38a3a5] rounded-full flex items-center justify-center text-white font-semibold">
              DR
            </div>
            <span className="text-gray-700 font-medium hidden sm:block">
              Dr. Rajapaksa
            </span>
            <ChevronDownIcon className="w-4 h-4 text-gray-600 hidden sm:block" />
          </button>
        </div>
      </div>
    </header>;
}