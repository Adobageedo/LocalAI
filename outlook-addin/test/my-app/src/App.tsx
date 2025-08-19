import React from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { AuthProvider } from './contexts/AuthContext';
import { OfficeProvider } from './contexts/OfficeContext';
import { useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import EmailSync from './components/EmailSync';
import EmailContext from './components/EmailContext';
import TemplateGenerator from './components/TemplateGenerator';
import './App.css';

// Initialize Fluent UI icons
initializeIcons();

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="App">
      <Header />
      <div className="container">
        <AuthSection />
        {user && user.email && <EmailSync userEmail={user.email} />}
        <EmailContext />
        <TemplateGenerator />
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
