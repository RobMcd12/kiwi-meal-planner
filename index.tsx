import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initVersionCheck, checkVersionAndRefresh } from './utils/versionCheck';

// Check version before rendering - may trigger refresh if new version detected
// If refresh is triggered, don't continue with rendering
if (checkVersionAndRefresh()) {
  // Page will refresh, stop execution
  console.log('[App] Version change detected, refresh in progress...');
} else {
  // Initialize version checking for visibility changes
  initVersionCheck();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);