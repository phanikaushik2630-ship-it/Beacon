import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BeaconLogo from './BeaconLogo';
import LiveBackground from './LiveBackground';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden text-white">
        <LiveBackground />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <BeaconLogo size={80} />
          <div className="flex flex-col items-center gap-2">
            <h2 className="font-playfair italic text-xl text-white beacon-name-glow">
              Authenticating Frequency…
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/70 font-mono tracking-widest uppercase">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              Securing Beacon session
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
