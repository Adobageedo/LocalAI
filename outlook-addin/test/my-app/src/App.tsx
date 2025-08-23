import React from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import { useTranslations } from './utils/i18n';
import EmailContext from './components/EmailContext';
import TabbedInterface from './components/TabbedInterface';
import AuthSection from './components/AuthSection';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function AppContent() {
  const { user } = useAuth();
  const t = useTranslations();

  // If user is not authenticated, only show the auth section
  if (!user) {
    return (
      <div className="App auth-only">
        <div className="container">
          <AuthSection />
        </div>
      </div>
    );
  }

  // When authenticated, show the full application
  return (
    <div className="App">
      <div className="container">
        <EmailContext />
        <TabbedInterface />
      </div>
    </div>
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
