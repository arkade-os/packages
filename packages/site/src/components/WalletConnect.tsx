import React, { useEffect, useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import { Dashboard } from './Dashboard';
import './WalletConnect.css';

export const WalletConnect: React.FC = () => {
  const {
    isConnected,
    walletInfo,
    loading,
    metamaskStatus,
    connectSnap,
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

        {/* Show different UI based on MetaMask status */}
        {metamaskStatus === 'checking' && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Checking for MetaMask Flask...</p>
          </div>
        )}

        {metamaskStatus === 'flask-ready' && (
          <>
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
              </div>
            )}
          </>
        )}

        {(metamaskStatus === 'no-metamask' || metamaskStatus === 'other-wallet') && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              🦊
            </div>
            <h2 style={{ marginBottom: '10px', color: '#FF6B35' }}>MetaMask Flask Required</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {metamaskStatus === 'other-wallet'
                ? 'We detected another wallet. Please install MetaMask Flask to use this app.'
                : 'MetaMask Flask is required to use Bitcoin Snaps.'}
            </p>
            <a
              href="https://metamask.io/flask/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
            >
              Install MetaMask Flask
            </a>
          </div>
        )}

        {metamaskStatus === 'wrong-metamask' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              🦊
            </div>
            <h2 style={{ marginBottom: '10px', color: '#FF6B35' }}>Upgrade to MetaMask Flask</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              You have regular MetaMask installed. This app requires <strong>MetaMask Flask</strong> (the developer version) to support Bitcoin Snaps.
            </p>
            <a
              href="https://metamask.io/flask/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
            >
              Install MetaMask Flask
            </a>
            <p style={{ marginTop: '15px', fontSize: '0.875rem', color: '#999' }}>
              Note: Flask can run alongside regular MetaMask
            </p>
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
