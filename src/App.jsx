import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import About from './pages/About';
import Programs from './pages/Programs';
import Admissions from './pages/Admissions';
import PortalGateway from './pages/PortalGateway';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';
import AdminLogin from './pages/AdminLogin';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import StudentDashboard from './pages/StudentDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          {/* Public routes */}
          <Route path="/"           element={<Home />} />
          <Route path="/about"      element={<About />} />
          <Route path="/programs"   element={<Programs />} />
          <Route path="/admissions" element={<Admissions />} />

          {/* Portal gateway + individual login pages */}
          <Route path="/login"         element={<PortalGateway />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/staff-login"   element={<StaffLogin />} />
          <Route path="/admin-login"   element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected dashboard routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-dashboard"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
