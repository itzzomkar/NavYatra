import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Ensure the DOM is loaded before attempting to render
const container = document.getElementById('root');

if (!container) {
  throw new Error('Failed to find the root element. Make sure there is a div with id="root" in your index.html');
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
