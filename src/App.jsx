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
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import StudentDashboard from './pages/StudentDashboard';
import RegistrarDashboard from './pages/RegistrarDashboard';
import RegistrarLogin from './pages/RegistrarLogin';

import FAQ from './pages/FAQ';
import Research from './pages/Research';
import ELearning from './pages/ELearning';
import ITLogin from './pages/ITLogin';
import ITDashboard from './pages/ITDashboard';
import FinanceLogin from './pages/FinanceLogin';
import FinanceDashboard from './pages/FinanceDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import FeesTuition from './pages/FeesTuition';

import { getSubdomain } from './utils/subdomain';

function App() {
  const subdomain = getSubdomain();

  // Define which login goes with which subdomain
  const subdomainConfig = {
    student: <StudentLogin />,
    staff: <StaffLogin />,
    admin: <AdminLogin />,
    registrar: <RegistrarLogin />,
    it: <ITLogin />,
    finance: <FinanceLogin />,
  };

  const portalElement = subdomainConfig[subdomain];

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          {/* If on a subdomain, the root / is the login for that portal */}
          {portalElement && <Route path="/" element={portalElement} />}

          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/research" element={<Research />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/fees-tuition" element={<FeesTuition />} />

          {/* Portal gateway + individual login pages */}
          <Route path="/login" element={<PortalGateway />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/registrar-login" element={<RegistrarLogin />} />
          <Route path="/it-login" element={<ITLogin />} />
          <Route path="/finance-login" element={<FinanceLogin />} />

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
          <Route
            path="/registrar-dashboard"
            element={
              <ProtectedRoute allowedRoles={['registrar']}>
                <RegistrarDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/it-dashboard"
            element={
              <ProtectedRoute allowedRoles={['it']}>
                <ITDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance-dashboard"
            element={
              <ProtectedRoute allowedRoles={['finance']}>
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/elearning"
            element={
              <ProtectedRoute allowedRoles={['student', 'staff']}>
                <ELearning />
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
