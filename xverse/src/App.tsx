import React from 'react';
import { XverseProvider, useXverse } from './components/XverseProvider';
import { Dashboard } from './components/Dashboard';

const AppContent: React.FC = () => {
  const { walletInfo, isConnecting, connectWallet, disconnectWallet, currentNetwork, switchNetwork } = useXverse();

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Arkade × Xverse</h1>
          <p style={styles.subtitle}>Bitcoin Layer 2 with Xverse Wallet</p>
        </div>

        <div style={styles.headerActions}>
          {!walletInfo ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={styles.connectButton}
            >
              {isConnecting ? 'Connecting...' : 'Connect Xverse Wallet'}
            </button>
          ) : (
            <div style={styles.connectedActions}>
              <select
                value={currentNetwork}
                onChange={(e) => switchNetwork(e.target.value as 'bitcoin' | 'signet')}
                style={styles.networkSelect}
              >
                <option value="bitcoin">Bitcoin Mainnet</option>
                <option value="signet">Bitcoin Signet</option>
              </select>
              <button onClick={disconnectWallet} style={styles.disconnectButton}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {walletInfo ? (
        <Dashboard />
      ) : (
        <div style={styles.welcome}>
          <div style={styles.welcomeCard}>
            <h2>Welcome to Arkade</h2>
            <p>
              Experience instant Bitcoin transactions with the Ark protocol, powered by
              your Xverse wallet.
            </p>
            <ul style={styles.featureList}>
              <li>✨ Instant off-chain Bitcoin transfers (VTXOs)</li>
              <li>⚡ Lightning Network payments via submarine swaps</li>
              <li>🔒 Self-custodial - your keys, your Bitcoin</li>
              <li>🦊 Powered by Xverse wallet and Sats Connect</li>
            </ul>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={styles.connectButtonLarge}
            >
              {isConnecting ? 'Connecting...' : 'Get Started with Xverse'}
            </button>
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <p>
          Built with{' '}
          <a
            href="https://github.com/arkade-os/arkade-sdk"
            target="_blank"
            rel="noopener noreferrer"
          >
            Arkade SDK
          </a>
          {' and '}
          <a
            href="https://docs.xverse.app/sats-connect"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sats Connect
          </a>
        </p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <XverseProvider>
      <AppContent />
    </XverseProvider>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '20px',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#666',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  connectedActions: {
    display: 'flex',
    gap: '12px',
  },
  networkSelect: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  connectButton: {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  connectButtonLarge: {
    padding: '16px 32px',
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '20px',
  },
  disconnectButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  welcome: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 200px)',
    padding: '40px 20px',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '600px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '24px 0',
    textAlign: 'left' as const,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#666',
    fontSize: '14px',
  },
};

export default App;
