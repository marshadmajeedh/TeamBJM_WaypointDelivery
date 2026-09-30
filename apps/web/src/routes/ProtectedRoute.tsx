import React, { ReactNode } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { UserRole } from '@waypoint/shared';
import { useAuth, getRolePortalPath } from '../features/auth/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: ReactNode;
}

/**
 * Reusable route protection component.
 * - Redirects unauthenticated users to /login.
 * - Redirects authenticated users with incorrect roles to their designated portal.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized user to their authorized portal
    const targetPath = getRolePortalPath(user.role);
    return <Navigate to={targetPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
