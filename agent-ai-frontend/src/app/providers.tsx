'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Add this to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
