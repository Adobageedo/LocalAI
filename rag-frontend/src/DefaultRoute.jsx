import React from 'react';
import { useAuth } from './auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';

export default function DefaultRoute() {
  const { isAuthenticated } = useAuth();
  // If user is authenticated, go to dashboard; else, go to home
  return isAuthenticated ? <Dashboard /> : <Home />;
}
