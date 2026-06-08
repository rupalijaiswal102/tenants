import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Login from '../pages/Login';
import './index.css';
import './styles/responsive.css';

function Root() {
  const stored = localStorage.getItem('neoteric_auth');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return Boolean(stored && JSON.parse(stored)?.token); }
    catch { return false; }
  });

  const handleLogin = (user: any) => {
    localStorage.setItem('neoteric_auth', JSON.stringify(user));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('neoteric_auth');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <App onLogout={handleLogout} />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);