import React from 'react';
import { Stack } from '@fluentui/react';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReadMode from './components/ReadMode';
import ComposeMode from './components/ComposeMode';
import AuthSection from './components/AuthSection';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <Stack className="App" tokens={{ childrenGap: 15 }} styles={{ root: { padding: 15 } }}>
        <AuthSection />
        <Routes>
          <Route path="/" element={<Navigate to="/read" replace />} />
          <Route path="/read" element={<ReadMode />} />
          <Route path="/compose" element={<ComposeMode />} />
          <Route path="*" element={<Navigate to="/read" replace />} />
        </Routes>
      </Stack>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <OfficeProvider>
        <AppContent />
      </OfficeProvider>
    </AuthProvider>
  );
}

export default App;
