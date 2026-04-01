import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Login } from './pages/Login';
import { Calendar } from './pages/Calendar';
import { MyBookings } from './pages/MyBookings';
import { TodayInLab } from './pages/TodayInLab';
import { ChangePassword } from './pages/ChangePassword';
import { AdminUsers } from './pages/admin/Users';
import { AdminSettings } from './pages/admin/Settings';
import { AdminStats } from './pages/admin/Stats';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Calendar />} />
            <Route path="today" element={<TodayInLab />} />
            <Route path="my-bookings" element={<MyBookings />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route element={<AdminRoute />}>
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/settings" element={<AdminSettings />} />
              <Route path="admin/stats" element={<AdminStats />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
