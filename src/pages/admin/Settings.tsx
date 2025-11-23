import React, { useState } from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { BellIcon, GlobeIcon, ShieldIcon, DatabaseIcon, SaveIcon, DownloadIcon } from 'lucide-react';
export function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="lg:ml-64 flex flex-col">
        <Header onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-gray-600 text-sm mb-2">Dashboard / Settings</p>
            <h1 className="text-3xl font-bold text-gray-900">
              System Settings
            </h1>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <BellIcon className="w-5 h-5 text-[#38A3A5]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Notifications
                </h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      Email Notifications
                    </p>
                    <p className="text-sm text-gray-600">
                      Receive email updates for important events
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#38A3A5]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#38A3A5]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      SMS Notifications
                    </p>
                    <p className="text-sm text-gray-600">
                      Receive SMS alerts for urgent matters
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#38A3A5]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#38A3A5]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      Push Notifications
                    </p>
                    <p className="text-sm text-gray-600">
                      Receive push notifications on your device
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#38A3A5]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#38A3A5]"></div>
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <GlobeIcon className="w-5 h-5 text-[#38A3A5]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Language & Region
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Language
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
                    <option>English</option>
                    <option>Sinhala</option>
                    <option>Tamil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Time Zone
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent">
                    <option>Asia/Colombo (GMT+5:30)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <ShieldIcon className="w-5 h-5 text-[#38A3A5]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Security</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Current Password
                  </label>
                  <input type="password" placeholder="Enter current password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    New Password
                  </label>
                  <input type="password" placeholder="Enter new password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Confirm New Password
                  </label>
                  <input type="password" placeholder="Confirm new password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#38A3A5] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <DatabaseIcon className="w-5 h-5 text-[#38A3A5]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Data Management
                </h2>
              </div>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#38A3A5] text-[#38A3A5] rounded-lg font-medium hover:bg-[#38A3A5] hover:text-white transition-colors">
                  <DownloadIcon className="w-5 h-5" />
                  Export All Data
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-500 hover:text-white transition-colors">
                  <DatabaseIcon className="w-5 h-5" />
                  Clear Cache
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-8 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors">
                <SaveIcon className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>;
}