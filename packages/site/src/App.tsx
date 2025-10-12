import { useState, useEffect } from 'react';
import { MetaMaskProvider } from './components/MetaMaskProvider';
import { Header } from './components/Header';
import { WalletConnect } from './components/WalletConnect';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  return (
    <MetaMaskProvider>
      <div className="app">
        <Header />
        <main className="main-content">
          <WalletConnect />
        </main>
      </div>
    </MetaMaskProvider>
  );
}

export default App;
