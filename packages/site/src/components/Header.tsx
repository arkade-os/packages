import React from 'react';
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
          <a href="#wallet" className="nav-link">Wallet</a>
          <a href="#about" className="nav-link">About</a>
          <a href="https://arkadeos.com" target="_blank" rel="noopener noreferrer" className="nav-link">
            Docs
          </a>
        </nav>
      </div>
    </header>
  );
};
