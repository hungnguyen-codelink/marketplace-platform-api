import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface RequireRoleProps {
  role: UserRole;
  children: React.ReactNode;
}

export default function RequireRole({ role, children }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // Seller-specific gate: redirect to onboarding if not verified/accepted terms
  if (role === 'seller' && (!user.email_verified || !user.terms_accepted)) {
    return <Navigate to="/seller/onboarding" replace />;
  }

  return <>{children}</>;
}
