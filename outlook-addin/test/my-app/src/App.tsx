import React, { useState } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { IconButton, Stack } from '@fluentui/react';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import { useTranslations } from './utils/i18n';
import EmailContext from './components/EmailContext';
import TabbedInterface from './components/TabbedInterface';
import Sidebar from './components/Sidebar';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function AppContent() {
  const { user } = useAuth();
  const t = useTranslations();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="App">
      <header className="app-header">
        <Stack horizontal horizontalAlign="end" verticalAlign="center" style={{ padding: '8px 16px' }}>
          <IconButton 
            iconProps={{ iconName: 'Settings' }} 
            title={t.settings || "Settings"}
            ariaLabel={t.settings || "Settings"}
            onClick={() => setIsSidebarOpen(true)}
          />
        </Stack>
      </header>
      <div className="container">
        <EmailContext />
        <TabbedInterface />
      </div>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onDismiss={() => setIsSidebarOpen(false)} 
      />
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
