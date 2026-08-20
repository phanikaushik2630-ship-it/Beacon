import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Brief initial session check
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children ? children : <Outlet />;
}
