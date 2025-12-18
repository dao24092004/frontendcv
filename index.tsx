// Polyfill cho biến global (để tránh lỗi thư viện cũ)
(window as any).global = window;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- QUAN TRỌNG: Dòng này giúp Tailwind hoạt động ---
import './index.css';
// ---------------------------------------------------

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