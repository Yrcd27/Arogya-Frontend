import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold text-[#38A3A5] mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has moved.</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-[#38A3A5] text-white rounded-lg font-medium hover:bg-[#2d8284] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
