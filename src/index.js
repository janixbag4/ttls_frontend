import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './api/axiosConfig'; // Initialize axios configuration for auth handling

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
