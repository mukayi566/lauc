import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute – wraps a dashboard route.
 *
 * Props:
 *  - allowedRoles: string[]  e.g. ['admin'] or ['student', 'staff']
 *  - children: React node
 *
 * Behaviour:
 *  - Not logged in → redirect to /login
 *  - Logged in but wrong role → redirect to their correct dashboard
 *  - Correct role → render children
 */
import { getSubdomain } from '../utils/subdomain';

const roleRouteMap = {
  admin: '/admin-dashboard',
  staff: '/staff-dashboard',
  student: '/student-dashboard',
  registrar: '/registrar-dashboard',
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { currentUser, userRole } = useAuth();
  const subdomain = getSubdomain();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Subdomain enforcement:
  // If we are on a portal subdomain (e.g. staff.lauc.edu), 
  // ensure the user has that specific role.
  if (subdomain && subdomain !== userRole) {
    return <Navigate to="/login" state={{ error: `Access Denied: This subdomain is for ${subdomain}s only.` }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to login with error state instead of their dashboard
    return <Navigate to="/login" state={{ error: "Access Denied: You do not have permissions to access this dashboard." }} replace />;
  }

  return children;
};

export default ProtectedRoute;
