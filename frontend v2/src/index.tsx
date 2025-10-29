/**
 * Application Entry Point
 * Point d'entrée de l'application React
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Initialiser Office.js avant de rendre l'application
if (typeof Office !== 'undefined') {
  Office.onReady(() => {
    console.log('Office.js initialized successfully');
    renderApp();
  });
} else {
  // Mode développement (sans Office.js)
  console.log('Running in development mode without Office.js');
  renderApp();
}

function renderApp() {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <div style={{ padding: '20px' }}>
        <h1>Outlook AI Assistant v2</h1>
        <p>Application en cours de développement...</p>
        <p>Architecture fondamentale établie ✅</p>
        <ul>
          <li>✅ Configuration (11 fichiers)</li>
          <li>✅ Models/Types (15 fichiers)</li>
          <li>✅ Utils (19 fichiers)</li>
          <li>✅ API Layer (10 fichiers)</li>
          <li>🔄 Services (en cours)</li>
          <li>🔄 Hooks (à venir)</li>
          <li>🔄 Components (à venir)</li>
        </ul>
      </div>
    </React.StrictMode>
  );
}

// Hot Module Replacement (HMR) pour le développement
if (module.hot) {
  module.hot.accept();
}
