'use client';

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface PermissionGuardProps {
  role: UserRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  role,
  fallback = null,
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // or loading skeleton/spinner if needed
  }

  if (!user) {
    return <>{fallback}</>;
  }

  // ADMIN bypasses all roles, otherwise user role must match perfectly
  const hasPermission = user.role === 'ADMIN' || user.role === role;

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
