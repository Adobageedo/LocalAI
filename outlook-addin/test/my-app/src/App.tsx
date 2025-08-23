import React, { useState } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { Stack, PrimaryButton } from '@fluentui/react';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import { useTranslations } from './utils/i18n';
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

// Navigation component to switch between main app and composer
type NavigationProps = {
  currentView: string;
  setCurrentView: (view: string) => void;
};

function Navigation({ currentView, setCurrentView }: NavigationProps) {
  const t = useTranslations();
  return (
    <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 10 }} styles={{ root: { padding: '10px' } }}>
      <PrimaryButton 
        text={t.replyTab} 
        onClick={() => setCurrentView('main')} 
        primary={currentView === 'main'} 
      />
      <PrimaryButton 
        text={t.composeTab} 
        onClick={() => setCurrentView('composer')} 
        primary={currentView === 'composer'} 
      />
    </Stack>
  );
}

function AppContent() {
  const { user } = useAuth();
  const t = useTranslations();
  const [currentView, setCurrentView] = useState('main');

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

  // When authenticated, show the full application with state-based navigation
  return (
    <div className="App">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      {currentView === 'main' ? <MainApp /> : <ComposerApp />}
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
