import React, { useEffect, useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import { Dashboard } from './Dashboard';
import './WalletConnect.css';

export const WalletConnect: React.FC = () => {
  const {
    isFlask,
    isSnapInstalled,
    isConnected,
    walletInfo,
    loading,
    error,
    connectSnap,
    createWallet,
    resetWallet,
    getWallet,
  } = useMetaMask();

  const [showResetOption, setShowResetOption] = useState(false);

  // Check if error is about wallet already existing
  useEffect(() => {
    if (error && error.includes('already exists')) {
      setShowResetOption(true);
    }
  }, [error]);

  const handleCreateWallet = async (network: string) => {
    try {
      await createWallet(network);
      setShowResetOption(false);
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        setShowResetOption(true);
      }
    }
  };

  const handleResetWallet = async () => {
    try {
      await resetWallet();
      setShowResetOption(false);
      // After reset, try to get wallet again to refresh state
      await getWallet();
    } catch (err) {
      console.error('Error resetting wallet:', err);
    }
  };

  if (!isFlask && !loading) {
    return (
      <div className="connect-container animate-fade-in">
        <div className="connect-card">
          <div className="icon-wrapper">
            <span className="icon">🦊</span>
          </div>
          <h2 className="connect-title">MetaMask Flask Required</h2>
          <p className="connect-description">
            To use Arkade Wallet, you need to install MetaMask Flask - a developer-friendly version
            of MetaMask that supports Snaps.
          </p>
          <a
            href="https://metamask.io/flask/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Install MetaMask Flask
          </a>
        </div>
      </div>
    );
  }

  if (!isConnected && !walletInfo) {
    return (
      <div className="connect-container animate-fade-in">
        <div className="connect-card">
          <div className="icon-wrapper">
            <span className="icon">🔷</span>
          </div>
          <h1 className="connect-title gradient-text">Welcome to Arkade Wallet</h1>
          <p className="connect-description">
            Bitcoin Layer 2 wallet with Lightning Network and Tether support. Experience instant
            off-chain transactions with the Ark protocol.
          </p>
          <div className="features">
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span className="feature-text">Instant Transfers</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <span className="feature-text">Self-Custodial</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💰</span>
              <span className="feature-text">Low Fees</span>
            </div>
          </div>
          <button
            onClick={connectSnap}
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            {loading ? 'Connecting...' : 'Connect Snap'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    );
  }

  if (isConnected && !walletInfo) {
    return (
      <div className="connect-container animate-fade-in">
        <div className="connect-card">
          <div className="icon-wrapper">
            <span className="icon">👛</span>
          </div>
          <h2 className="connect-title">Create Your Wallet</h2>
          <p className="connect-description">
            No wallet found. Let's create a new Arkade wallet to get started with Bitcoin Layer 2.
          </p>
          <div className="network-selector">
            <button
              onClick={() => handleCreateWallet('testnet')}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Create Testnet Wallet'}
            </button>
            <button
              onClick={() => handleCreateWallet('bitcoin')}
              disabled={loading}
              className="btn btn-secondary"
            >
              Create Bitcoin Wallet
            </button>
          </div>
          {error && !showResetOption && <p className="error-message">{error}</p>}
          {showResetOption && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 10px 0', color: '#856404' }}>
                ⚠️ A wallet already exists. You can reset it to create a new one.
              </p>
              <button
                onClick={handleResetWallet}
                disabled={loading}
                className="btn btn-secondary"
                style={{ width: '100%', background: '#dc3545' }}
              >
                {loading ? 'Resetting...' : 'Reset Wallet'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <Dashboard />;
};
