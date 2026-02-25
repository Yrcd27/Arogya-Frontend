import { AppRouter } from './AppRouter';
import { AuthProvider } from './context/AuthContext';
import { ChatBot } from './components/ChatBot/ChatBot';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './toast-custom.css';

export function App() {
  return (
    <AuthProvider>
      <div className="w-full min-h-screen bg-gray-50">
        <AppRouter />
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
    </AuthProvider>
  );
}