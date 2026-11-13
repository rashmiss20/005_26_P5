import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { RequireAuth } from '@/components/RequireAuth';
import Login from '@/pages/Login';
import UserDashboard from '@/pages/UserDashboard';
import SubmitReport from '@/pages/SubmitReport';
import HandlerDashboard from '@/pages/HandlerDashboard';
import RoutingDashboard from '@/pages/RoutingDashboard';
import Analytics from '@/pages/Analytics';
import Tests from '@/pages/Tests';
import DownloadPage from '@/pages/DownloadPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<RequireAuth roles={['user']}><UserDashboard /></RequireAuth>} />
            <Route path="/submit" element={<RequireAuth roles={['user']}><SubmitReport /></RequireAuth>} />
            <Route path="/handler" element={<RequireAuth roles={['handler']}><HandlerDashboard /></RequireAuth>} />
            <Route path="/routing" element={<RequireAuth roles={['admin', 'handler']}><RoutingDashboard /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
            <Route path="/tests" element={<RequireAuth roles={['admin']}><Tests /></RequireAuth>} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
