import React, { useEffect, useState } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import EmailContext from './components/EmailContext';
import TabbedInterface from './components/read/TabbedInterface';
import MessageComposer from './components/compose/MessageComposer';
import AuthSection from './components/sidebar/AuthSection';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function MainApp() {
  return (
    <div className="container">
      <EmailContext />
      <TabbedInterface />
    </div>
  );
}

function ComposerApp() {
  return (
    <div className="container">
      <EmailContext />
      <MessageComposer />
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
    
    if (modeParam === 'compose' || modeParam === 'read') {
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

  // When authenticated, show the appropriate app based on URL mode parameter
  return (
    <div className="App">
      {mode === 'compose' ? <ComposerApp /> : <MainApp />}
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
