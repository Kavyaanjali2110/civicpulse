import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // 1. Not Authenticated
  if (!isAuthenticated || !user) {
    let loginPath = '/citizen/login';
    if (allowedRole === 'government') loginPath = '/government/login';
    if (allowedRole === 'field_crew') loginPath = '/crew/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // 2. Authenticated but attempting cross-role access
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'citizen') {
      return <Navigate to="/citizen/dashboard" replace />;
    }
    if (user.role === 'government') {
      return <Navigate to="/government/dashboard" replace />;
    }
    if (user.role === 'field_crew') {
      return <Navigate to="/crew/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
