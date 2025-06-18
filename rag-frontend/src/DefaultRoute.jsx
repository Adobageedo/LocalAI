import React from 'react';
import { useAuth } from './auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import Chatbot from './pages/Chatbot';
import Home from './pages/Home';

export default function DefaultRoute() {
  const { isAuthenticated } = useAuth();
  // If user is authenticated, go to dashboard; else, go to home
  return isAuthenticated ? <Chatbot /> : <Home />;
}
