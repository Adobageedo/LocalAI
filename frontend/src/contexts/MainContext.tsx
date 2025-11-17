import { AuthProvider } from './AuthContext';
import { OfficeProvider } from './OfficeContext';
import { QuickActionProvider } from './QuickActionContext';
import React, { ReactNode } from 'react';

type MainProviderProps = {
  children: ReactNode;
};

export const MainProvider: React.FC<MainProviderProps> = ({ children }) => {
  return (
    <AuthProvider>
      <OfficeProvider>
        <QuickActionProvider>
          {children}
        </QuickActionProvider>
      </OfficeProvider>
    </AuthProvider>
  );
};

export default MainProvider;
