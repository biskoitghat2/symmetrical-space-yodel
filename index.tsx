import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { useDataStore } from './store/dataStore';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Dev-only: expose the Zustand store on window for browser-console debugging/seeding.
if (import.meta.env.DEV) {
  (window as any).__store = useDataStore;
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide initial HTML loader after React mounts
setTimeout(() => {
  document.body.classList.add('react-loaded');
}, 100);