/**
 * App Component
 * Composant principal de l'application avec tous les providers
 */

import { MemoryRouter } from 'react-router-dom';
import { auth } from './config/firebase';
import { initializeAuthService } from './services/auth/AuthService';
import {
  AuthProvider,
  ThemeProvider,
  LanguageProvider,
  OfficeProvider
} from './contexts';
import AppRoutes from './routes/AppRoutes';

// Initialiser AuthService immédiatement au chargement du module
// AVANT que les composants ne se montent
try {
  initializeAuthService(auth);
  console.log('✅ AuthService initialized');
} catch (error) {
  console.error('❌ Error initializing AuthService:', error);
}

/**
 * App Component - Wrapper avec tous les providers
 * 
 * Note: MemoryRouter est utilisé car Office.js interfère avec l'API History
 * du navigateur (replaceState), causant des erreurs avec BrowserRouter et HashRouter.
 * MemoryRouter garde l'historique en mémoire sans utiliser l'URL du navigateur.
 * 
 * Limitation: L'URL ne change pas visuellement, mais la navigation fonctionne.
 */
function App() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <OfficeProvider>
              <AppRoutes />
            </OfficeProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

export default App;
