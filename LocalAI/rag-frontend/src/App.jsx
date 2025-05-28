import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Toutes les routes sont maintenant publiques */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/folders" element={<Folders />} />
        <Route path="/prompt" element={<Prompt />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/preferences" element={<UserPreferences />} />
        <Route path="/mail-import" element={<MailImport />} />
        <Route path="/nextcloud" element={<Nextcloud />} />
        <Route path="/nextcloud-explorer" element={<NextcloudExplorer />} />
        
        {/* Route par défaut - retourne vers le dashboard */}
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
