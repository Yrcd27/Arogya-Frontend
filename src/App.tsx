import { AppRouter } from './AppRouter';
import { AuthProvider } from './context/AuthContext';
import { UserProfileProvider } from './context/UserProfileContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatBot } from './components/ChatBot/ChatBot';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './toast-custom.css';

export function App() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <div className="w-full min-h-screen bg-gray-50">
          <ErrorBoundary>
            <AppRouter />
          </ErrorBoundary>
          <ChatBot />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </UserProfileProvider>
    </AuthProvider>
  );
}
