import React, { useEffect, useState } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import { TemplateHub } from './components/features/email';
import { EmailComposer } from './components/features/email';
import { AuthSection } from './components/layout/Sidebar';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function MainApp() {
  return (
    <div className="container">
      <TemplateHub />
    </div>
  );
}

function ComposerApp() {
  return (
    <div className="container">
      <EmailComposer />
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
