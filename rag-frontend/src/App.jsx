import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { OnboardingProvider } from './context/OnboardingContext';
import { OnboardingTour, TourCompletionMessage } from './components/onboarding';

// Importation de tous les composants de pages disponibles pour l'accès direct
// Pages de profil utilisateur
import UserProfilePage from './pages/UserProfilePage';
import DocumentExplorer from './pages/DocumentExplorer';
import MailImport from './pages/MailImport';
import Login from './pages/Login';
import Register from './pages/Register';
import Chatbot from './pages/Chatbot';
import { PrivateRoute } from './components/PrivateRoute';
import DefaultRoute from './DefaultRoute';
import Home from './pages/Home';

function App() {
  return (
    <AuthProvider>
      <Router>
        <OnboardingProvider>
          {/* Onboarding Tour components */}
          <OnboardingTour />
          <TourCompletionMessage />
          
          <Routes>
            {/* Public Home route now handled by DefaultRoute */}
            <Route path="/" element={<DefaultRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />

            {/* Private (user-only) routes */}
            <Route path="/profile" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />
            <Route path="/mail-import" element={<PrivateRoute><MailImport /></PrivateRoute>} />
            <Route path="/document-explorer" element={<PrivateRoute><DocumentExplorer /></PrivateRoute>} />
            <Route path="/chatbot" element={<PrivateRoute><Chatbot /></PrivateRoute>} />
            <Route path="/chatbot/:conversationId" element={<PrivateRoute><Chatbot /></PrivateRoute>} />
            {/* Default route: Home for guests, Dashboard for users */}
            <Route path="*" element={<DefaultRoute />} />
          </Routes>
        </OnboardingProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
