import React, { useState } from 'react';
import axios from 'axios';

// Set global axios baseURL from env — works in both dev and production
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Attach auth token to every request automatically
axios.interceptors.request.use(config => {
  try {
    const auth = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
    if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  } catch {}
  return config;
});
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App.jsx';
import Login from '../pages/Login.jsx';
import './index.css';
import './styles/responsive.css';

function Root() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const stored = localStorage.getItem('neoteric_auth');
      return Boolean(stored && JSON.parse(stored)?.token);
    } catch { return false; }
  });

  const handleLogin = (user) => {
    localStorage.setItem('neoteric_auth', JSON.stringify(user));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('neoteric_auth');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Login onLogin={handleLogin} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <App onLogout={handleLogout} />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);