import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill process for the browser to prevent crashes in services
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: { API_KEY: '' } };
}

console.log("MyHR: Booting application...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("MyHR Error: Root element #root not found in index.html");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("MyHR: Application mounted successfully.");
}