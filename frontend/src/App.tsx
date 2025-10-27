import React, { useEffect, useState } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import TabbedInterface from './components/read/TabbedInterface';
import { EmailComposer } from './components/compose';
import AuthSection from './components/sidebar/AuthSection';
import Sidebar from './components/sidebar/Sidebar';
import { Stack, Text, IconButton } from '@fluentui/react';
import { Edit20Regular } from '@fluentui/react-icons';
import { useTranslations } from './utils/i18n';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function MainApp() {
  return (
    <div className="container">
      <TabbedInterface />
    </div>
  );
}

function ComposerApp() {
  const { user } = useAuth();
  const t = useTranslations();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <div className="container">
      <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '3px' } }}>
        {/* Header with Settings Button */}
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between" styles={{ root: { width: '100%' } }}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <Edit20Regular style={{ fontSize: '18px', color: '#0078d4' }} />
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              Email Composer
            </Text>
          </Stack>
          <IconButton 
            iconProps={{ iconName: 'Settings' }} 
            title={t.settings || "Settings"}
            ariaLabel={t.settings || "Settings"}
            onClick={() => setIsSidebarOpen(true)}
          />
        </Stack>
        
        {/* Email Composer Component */}
        <EmailComposer />
        
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onDismiss={() => setIsSidebarOpen(false)} 
        />
      </Stack>
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
