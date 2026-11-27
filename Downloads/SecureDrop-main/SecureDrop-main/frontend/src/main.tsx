import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('SecureDrop root element was not found.');
}

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (window.location.pathname === '/' && rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
