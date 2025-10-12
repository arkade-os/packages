import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-container">
          <img
            src="/logo.png"
            alt="Arkade"
            className="logo"
          />
        </div>
        <nav className="nav">
          <Link to="/" className="nav-link">Wallet</Link>
          <Link to="/settings" className="nav-link">Settings</Link>
          <a href="https://arkadeos.com" target="_blank" rel="noopener noreferrer" className="nav-link">
            Docs
          </a>
        </nav>
      </div>
    </header>
  );
};
