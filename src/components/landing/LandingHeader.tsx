import React from 'react';
import { useNavigate } from 'react-router-dom';
export function LandingHeader() {
  const navigate = useNavigate();
  return <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#38A3A5] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Arogya</h1>
            <p className="text-xs text-gray-600">
              Ministry of Health Sri Lanka
            </p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" className="text-gray-700 hover:text-[#38A3A5] font-medium">
            Home
          </a>
          <a href="#about" className="text-gray-700 hover:text-[#38A3A5] font-medium">
            About
          </a>
          <a href="#services" className="text-gray-700 hover:text-[#38A3A5] font-medium">
            Services
          </a>
          <a href="#contact" className="text-gray-700 hover:text-[#38A3A5] font-medium">
            Contact
          </a>
          <button onClick={() => navigate('/login')} className="bg-[#38A3A5] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
            Login
          </button>
        </nav>
      </div>
    </header>;
}