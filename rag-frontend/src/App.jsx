import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';

// Authentication provider removed
import Dashboard from './pages/Dashboard';

// Importation de tous les composants de pages disponibles pour l'accès direct
import Folders from './pages/Folders';
import Prompt from './pages/Prompt';
// Pages de profil utilisateur
import UserProfilePage from './pages/UserProfilePage';
import UserPreferences from './pages/UserPreferences';
import NextcloudExplorer from './pages/NextcloudExplorer';
import MailImport from './pages/OpenWebUI';
import Nextcloud from './pages/Nextcloud';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { PrivateRoute } from './components/PrivateRoute';
import { useAuth } from './auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import DefaultRoute from './DefaultRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Home route now handled by DefaultRoute */}
          <Route path="/" element={<DefaultRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Private (user-only) routes */}
          <Route path="/folders" element={<PrivateRoute><Folders /></PrivateRoute>} />
          <Route path="/prompt" element={<PrivateRoute><Prompt /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />
          <Route path="/preferences" element={<PrivateRoute><UserPreferences /></PrivateRoute>} />
          <Route path="/mail-import" element={<PrivateRoute><MailImport /></PrivateRoute>} />
          <Route path="/nextcloud" element={<PrivateRoute><Nextcloud /></PrivateRoute>} />
          <Route path="/nextcloud-explorer" element={<PrivateRoute><NextcloudExplorer /></PrivateRoute>} />

          {/* Default route: Home for guests, Dashboard for users */}
          <Route path="*" element={<DefaultRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
