import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, authReady, profileLoading } = useAuth();
  const location = useLocation();

  // Wait for the initial session check to complete.
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-orange-500 border-b-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  // If no user is logged in, redirect to login page (preserve intended destination).
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admin-gated routes we MUST wait until the real profile (with the
  // server-side role) has been fetched. Otherwise the optimistic profile —
  // which always assumes role 'user' — would bounce real admins to '/'
  // before their role is confirmed.
  if (requireAdmin) {
    if (profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-white flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-orange-500 border-b-transparent rounded-full animate-spin" />
            Verifying access…
          </div>
        </div>
      );
    }
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
