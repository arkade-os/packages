import React, { useEffect, useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import { SendModal } from './SendModal';
import { ReceiveModal } from './ReceiveModal';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { walletInfo, balance, transactions, loading, getBalance, getTransactionHistory, resetWallet } =
    useMetaMask();
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | 'onchain' | 'offchain'>('all');

  useEffect(() => {
    if (walletInfo) {
      getBalance();
      getTransactionHistory();

      // Refresh balance every 30 seconds
      const interval = setInterval(() => {
        getBalance();
        getTransactionHistory();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [walletInfo]);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatBTC = (amount: number) => {
    return (amount / 100000000).toFixed(8);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleResetWallet = async () => {
    if (window.confirm('⚠️ WARNING: This will permanently delete your wallet data!\n\nMake sure you have:\n✓ Backed up your recovery phrase\n✓ Withdrawn all funds\n\nThis action cannot be undone. Are you sure?')) {
      try {
        await resetWallet();
        // Reload the page to return to the initial state
        window.location.reload();
      } catch (error) {
        console.error('Error resetting wallet:', error);
      }
    }
  };

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Your Arkade Wallet</h1>
        <div className="network-badge">
          {walletInfo?.network === 'signet' ? 'SigNet' : 'Bitcoin'}
        </div>
      </div>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-header">
          <h2 className="balance-label">Your Balance</h2>
          {loading && <span className="loading-spinner animate-pulse">↻</span>}
        </div>
        <div className="balance-amount gradient-text">
          {balance ? formatBTC(balance.offchain) : '0.00000000'} BTC
        </div>
        <div className="balance-breakdown">
          <div className="balance-item">
            <span className="balance-item-label">⚡ VTXOs (Available)</span>
            <span className="balance-item-value">
              {balance?.vtxoList?.length || 0} VTXOs
            </span>
          </div>
          <div className="balance-item">
            <span className="balance-item-label">🔗 Boarding (Pending)</span>
            <span className="balance-item-value">
              {balance ? formatBTC(balance.onchain) : '0.00000000'} BTC
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn btn-primary" onClick={() => setShowSendModal(true)}>
          <span className="action-icon">📤</span>
          Send
        </button>
        <button className="action-btn btn-primary" onClick={() => setShowReceiveModal(true)}>
          <span className="action-icon">📥</span>
          Receive
        </button>
      </div>

      {/* Addresses */}
      <div className="addresses-section">
        <div className="address-card">
          <div className="address-header">
            <span className="address-label">Ark Address</span>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(walletInfo?.arkAddress)}
              title="Copy to clipboard"
            >
              📋
            </button>
          </div>
          <code className="address-value">{formatAddress(walletInfo?.arkAddress)}</code>
        </div>
        <div className="address-card">
          <div className="address-header">
            <span className="address-label">Boarding Address</span>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(walletInfo?.boardingAddress)}
              title="Copy to clipboard"
            >
              📋
            </button>
          </div>
          <code className="address-value">{formatAddress(walletInfo?.boardingAddress)}</code>
        </div>
      </div>

      {/* Transaction History */}
      <div className="transactions-section">
        <div className="transactions-header">
          <h2 className="section-title">Transaction History</h2>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${txFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTxFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${txFilter === 'offchain' ? 'active' : ''}`}
              onClick={() => setTxFilter('offchain')}
            >
              ⚡ VTXOs
            </button>
            <button
              className={`filter-btn ${txFilter === 'onchain' ? 'active' : ''}`}
              onClick={() => setTxFilter('onchain')}
            >
              🔗 Boarding
            </button>
          </div>
        </div>
        {transactions && transactions.length > 0 ? (
          <div className="transactions-list">
            {transactions
              .filter(tx => txFilter === 'all' || tx.layer === txFilter)
              .map((tx, index) => (
              <div key={index} className="transaction-item">
                <div className="transaction-icon">
                  {tx.type === 'send' ? '📤' : '📥'}
                </div>
                <div className="transaction-details">
                  <div className="transaction-type">
                    {tx.type === 'send' ? 'Sent' : 'Received'}
                    <span className={`layer-badge layer-badge-${tx.layer}`}>
                      {tx.layer === 'offchain' ? '⚡ VTXO' : '🔗 Boarding'}
                    </span>
                  </div>
                  <div className="transaction-time">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="transaction-amount">
                  <span className={tx.type === 'send' ? 'amount-negative' : 'amount-positive'}>
                    {tx.type === 'send' ? '-' : '+'}
                    {formatBTC(tx.amount)} BTC
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p className="empty-text">No transactions yet</p>
            <p className="empty-subtext">Send or receive Bitcoin to see your transaction history</p>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="settings-section">
        <h2 className="section-title">Settings</h2>
        <div className="danger-zone">
          <div className="danger-zone-header">
            <span className="danger-icon">⚠️</span>
            <h3 className="danger-title">Danger Zone</h3>
          </div>
          <p className="danger-description">
            Reset your wallet to remove all stored data. Make sure you have backed up your recovery phrase and withdrawn all funds before proceeding.
          </p>
          <button
            className="btn-danger"
            onClick={handleResetWallet}
            disabled={loading}
          >
            Reset Wallet
          </button>
        </div>
      </div>

      {/* Modals */}
      {showSendModal && <SendModal onClose={() => setShowSendModal(false)} />}
      {showReceiveModal && <ReceiveModal onClose={() => setShowReceiveModal(false)} />}
    </div>
  );
};
