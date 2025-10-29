/**
 * Main Layout Component
 * Layout principal de l'application avec Header, Sidebar et contenu
 */

import { ReactNode } from 'react';
import { Stack } from '@fluentui/react';
import { useTheme } from '@/contexts';
import Header from './Header';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  const { mode } = useTheme();

  return (
    <Stack
      styles={{
        root: {
          height: '100vh',
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#faf9f8',
        },
      }}
    >
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <Stack
        horizontal
        styles={{
          root: {
            flex: 1,
            overflow: 'hidden',
          },
        }}
      >
        {/* Sidebar */}
        {showSidebar && <Sidebar />}

        {/* Content */}
        <Stack
          styles={{
            root: {
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              backgroundColor: mode === 'dark' ? '#252526' : '#ffffff',
            },
          }}
        >
          {children}
        </Stack>
      </Stack>
    </Stack>
  );
}
