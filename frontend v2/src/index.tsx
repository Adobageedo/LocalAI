/**
 * Application Entry Point
 * Point d'entrée de l'application React
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialiser Office.js avant de rendre l'application
if (typeof Office !== 'undefined') {
  // Supprimer le warning Office.js en développement
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('Office.js is loaded outside')) return;
    originalWarn.apply(console, args);
  };

  Office.onReady(() => {
    console.log('✅ Office.js initialized successfully');
    renderApp();
  });
} else {
  // Mode développement (sans Office.js)
  console.log('🔧 Running in development mode without Office.js');
  renderApp();
}

function renderApp() {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Hot Module Replacement (HMR) pour le développement
declare const module: any;
if (typeof module !== 'undefined' && module.hot) {
  module.hot.accept();
}
