import React, { useEffect, useState } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import MainProvider from './contexts/MainContext';
import { useAuth } from './contexts/AuthContext';
import EmailReaderPage from './pages/EmailReaderPage';
import EmailComposerPage from './pages/EmailComposerPage';
import Technicians from './pages/Technicians';
import Records from './pages/Records';
import { AuthSection } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/common';
import { validateEnvironment, logEnvironmentInfo } from './config/env';
import { logger } from './services';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function MainApp() {
  return (
    <div className="container">
      <EmailReaderPage />
    </div>
  );
}

function ComposerApp() {
  return (
    <div className="container">
      <EmailComposerPage />
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [mode, setMode] = useState<string>('read');

  // Get mode from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    // Only respect compose/read via query param
    const validModes = ['compose', 'read'];
    if (modeParam && validModes.includes(modeParam)) {
      setMode(modeParam);
    } else {
      // Default to 'read' if no valid mode parameter
      setMode('read');
    }
  }, []);

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

  // When authenticated, choose page by pathname (for technicians/records) or mode (read/compose)
  const renderPage = () => {
    const path = window.location.pathname;
    if (path === '/technicians') {
      return <div className="container"><Technicians /></div>;
    }
    if (path === '/records') {
      return <div className="container"><Records /></div>;
    }
    return mode === 'compose' ? <ComposerApp /> : <MainApp />;
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

function App() {
  // Validate environment and log info on startup
  useEffect(() => {
    const validation = validateEnvironment();
    if (!validation.isValid) {
      logger.error('Environment validation failed', 'App', undefined, { errors: validation.errors });
      validation.errors.forEach(error => console.error('❌', error));
    }
    
    logEnvironmentInfo();
  }, []);

  return (
    <ErrorBoundary>
      <MainProvider>
        <AppContent />
      </MainProvider>
    </ErrorBoundary>
  );
}

export default App;
