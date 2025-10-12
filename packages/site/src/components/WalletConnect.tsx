import React, { useEffect, useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import { Dashboard } from './Dashboard';
import './WalletConnect.css';

export const WalletConnect: React.FC = () => {
  const {
    isConnected,
    walletInfo,
    loading,
    connectSnap,
    resetWallet,
    getBalance,
    getTransactionHistory,
  } = useMetaMask();

  const [error, setError] = useState<string | null>(null);

  // Auto-load data when wallet is connected
  useEffect(() => {
    if (isConnected && walletInfo) {
      getBalance();
      getTransactionHistory();
    }
  }, [isConnected, walletInfo, getBalance, getTransactionHistory]);

  const handleConnect = async () => {
    try {
      setError(null);
      await connectSnap();
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect snap');
    }
  };

  const handleReset = async () => {
    if (window.confirm('⚠️ WARNING: This will reset your wallet connection.\n\nAre you sure?')) {
      try {
        await resetWallet();
        setError(null);
      } catch (err: any) {
        console.error('Reset error:', err);
        setError(err.message || 'Failed to reset wallet');
      }
    }
  };

  // Show wallet dashboard if connected
  if (isConnected && walletInfo) {
    return <Dashboard />;
  }

  // Show connection screen
  return (
    <div className="connect-container animate-fade-in">
      <div className="connect-card">
        <div className="icon-wrapper">
          <span className="icon">🔷</span>
        </div>
        <h1 className="connect-title gradient-text">Welcome to Arkade Wallet</h1>
        <p className="connect-description">
          Bitcoin Layer 2 wallet with Lightning Network support. Experience instant
          off-chain transactions with the Ark protocol on Signet testnet.
        </p>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span className="feature-text">Instant VTXOs</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span className="feature-text">Self-Custodial</span>
          </div>
          <div className="feature">
            <span className="feature-icon">💰</span>
            <span className="feature-text">Lightning Ready</span>
          </div>
        </div>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="btn btn-primary btn-lg"
        >
          {loading ? 'Connecting...' : 'Connect Snap'}
        </button>
        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            {error.includes('MetaMask') && (
              <a
                href="https://metamask.io/flask/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ marginTop: '10px' }}
              >
                Install MetaMask Flask
              </a>
            )}
          </div>
        )}
        <div className="info-box">
          <p className="info-text">
            ℹ️ This wallet uses <strong>Signet testnet</strong> for testing. You'll need MetaMask Flask installed.
          </p>
        </div>
      </div>
    </div>
  );
};
