import { AppRouter } from './AppRouter';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <div className="w-full min-h-screen bg-gray-50">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}