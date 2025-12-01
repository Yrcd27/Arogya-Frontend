export function LandingFooter() {
  return <footer className="bg-gray-900 text-white py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Arogya</h3>
            <p className="text-gray-400">Ministry of Health Sri Lanka</p>
            <p className="text-gray-400">
              385, Baddegama Wimalawansa Thero Mawatha
            </p>
            <p className="text-gray-400">Colombo 10, Sri Lanka</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Services
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <p className="text-gray-400">Phone: +94 11 269 1111</p>
            <p className="text-gray-400">Email: info@health.gov.lk</p>
            <p className="text-gray-400">Emergency: 1990</p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>© 2024 Ministry of Health Sri Lanka. All rights reserved.</p>
        </div>
      </div>
    </footer>;
}