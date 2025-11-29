import { AuthProvider } from './AuthContext';
import { OfficeProvider } from './OfficeContext';
import { EmailProvider } from './EmailContext';
import { QuickActionProvider } from './QuickActionContext';
import React, { ReactNode } from 'react';

type MainProviderProps = {
  children: ReactNode;
};

export const MainProvider: React.FC<MainProviderProps> = ({ children }) => {
  // Check if we're in Chrome extension context
  const isExtension = typeof window !== 'undefined' && window.chrome?.runtime?.id;
  
  return (
    <AuthProvider>
      {isExtension ? (
        <EmailProvider>
          <QuickActionProvider>
            {children}
          </QuickActionProvider>
        </EmailProvider>
      ) : (
        <OfficeProvider>
          <QuickActionProvider>
            {children}
          </QuickActionProvider>
        </OfficeProvider>
      )}
    </AuthProvider>
  );
};

export default MainProvider;
