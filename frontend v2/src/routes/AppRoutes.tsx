/**
 * App Routes Component
 * Configuration du routing de l'application
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts';
import {
  HomePage,
  ComposePage,
  EditEmailPage,
  TemplatesPage,
  HistoryPage,
  SettingsPage,
} from '@/pages';

/**
 * Protected Route Component
 * Protège les routes qui nécessitent l'authentification
 */
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * App Routes
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />

      {/* Protected Routes */}
      <Route
        path="/compose"
        element={
          <ProtectedRoute>
            <ComposePage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/edit"
        element={
          <ProtectedRoute>
            <EditEmailPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <TemplatesPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
