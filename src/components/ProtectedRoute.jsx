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
const roleRouteMap = {
  admin:   '/admin-dashboard',
  staff:   '/staff-dashboard',
  student: '/student-dashboard',
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to their proper dashboard
    return <Navigate to={roleRouteMap[userRole] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
