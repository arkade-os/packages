import React, { useState } from 'react';
import { useMetaMask, type SupportedNetwork } from './MetaMaskProvider';
import './Settings.css';
import './Modal.css';

const SNAP_ID = 'local:http://localhost:8080';

export const Settings: React.FC = () => {
  const { currentNetwork, networkConfig, switchNetwork, loading } = useMetaMask();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetNetwork, setTargetNetwork] = useState<SupportedNetwork | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [privateKeyData, setPrivateKeyData] = useState<{ hex: string; nsec: string } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleNetworkChange = (network: SupportedNetwork) => {
    if (network === currentNetwork) return;
    setTargetNetwork(network);
    setShowConfirmDialog(true);
    setSwitchError(null);
  };

  const confirmNetworkSwitch = async () => {
    if (!targetNetwork) return;

    try {
      await switchNetwork(targetNetwork);
      setShowConfirmDialog(false);
      setTargetNetwork(null);
    } catch (error: any) {
      setSwitchError(error.message || 'Failed to switch network');
    }
  };

  const cancelNetworkSwitch = () => {
    setShowConfirmDialog(false);
    setTargetNetwork(null);
    setSwitchError(null);
  };

  const handleExportPrivateKey = async () => {
    try {
      setBackupLoading(true);
      setBackupError(null);

      const response = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'arkade_exportPrivateKey',
          },
        },
      });

      if (response && response.hex && response.nsec) {
        setPrivateKeyData(response as { hex: string; nsec: string });
        setShowBackupModal(true);
      } else {
        throw new Error('Invalid response from snap');
      }
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        setBackupError('Export cancelled by user');
      } else {
        setBackupError(error.message || 'Failed to export private key');
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const closeBackupModal = () => {
    setShowBackupModal(false);
    setPrivateKeyData(null);
    setCopiedField(null);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      {/* Network Configuration */}
      <div className="settings-section">
        <h2 className="section-title">Network Configuration</h2>
        <div className="settings-card">
          <div className="setting-item">
            <div className="setting-label">Network</div>
            <div className="setting-value">
              <div className="network-selector">
                <button
                  className={`network-option ${currentNetwork === 'bitcoin' ? 'active' : ''}`}
                  onClick={() => handleNetworkChange('bitcoin')}
                  disabled={loading || currentNetwork === 'bitcoin'}
                >
                  Bitcoin
                </button>
                <button
                  className={`network-option ${currentNetwork === 'signet' ? 'active' : ''}`}
                  onClick={() => handleNetworkChange('signet')}
                  disabled={loading || currentNetwork === 'signet'}
                >
                  SigNet
                </button>
              </div>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Ark Server</div>
            <div className="setting-value">
              <code className="setting-code">{networkConfig.arkServerUrl}</code>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Esplora API</div>
            <div className="setting-value">
              <code className="setting-code">{networkConfig.esploraUrl}</code>
            </div>
          </div>
          {networkConfig.boltzUrl && (
            <div className="setting-item">
              <div className="setting-label">Boltz Swap API</div>
              <div className="setting-value">
                <code className="setting-code">{networkConfig.boltzUrl}</code>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backup & Security */}
      <div className="settings-section">
        <h2 className="section-title">Backup & Security</h2>
        <div className="settings-card">
          <div className="setting-item">
            <div className="setting-label">Private Key Backup</div>
            <div className="setting-value">
              <button
                className="btn btn-warning"
                onClick={handleExportPrivateKey}
                disabled={backupLoading}
              >
                {backupLoading ? 'Exporting...' : '🔐 Export Private Key'}
              </button>
            </div>
          </div>
          {backupError && (
            <div className="error-message" style={{ marginTop: '0.5rem' }}>
              {backupError}
            </div>
          )}
          <div className="info-box" style={{ marginTop: '1rem' }}>
            <p className="info-text">
              ⚠️ Never share your private key with anyone. Store it securely offline for backup purposes only.
            </p>
          </div>
        </div>
      </div>

      {/* Lightning History - Only show for networks with Lightning support */}
      {networkConfig.hasLightning && (
        <div className="settings-section">
          <h2 className="section-title">Lightning Network</h2>
          <div className="settings-card">
            <div className="coming-soon-container">
              <span className="coming-soon-icon">⚡</span>
              <div>
                <h3 className="coming-soon-title">Boltz Swap History</h3>
                <p className="coming-soon-text">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show info if Lightning is not available */}
      {!networkConfig.hasLightning && (
        <div className="settings-section">
          <h2 className="section-title">Lightning Network</h2>
          <div className="settings-card">
            <div className="coming-soon-container">
              <span className="coming-soon-icon">ℹ️</span>
              <div>
                <h3 className="coming-soon-title">Lightning Not Available</h3>
                <p className="coming-soon-text">
                  Lightning payments are not supported on {currentNetwork === 'signet' ? 'SigNet' : 'this network'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Switch Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={cancelNetworkSwitch}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Switch Network?</h2>
              <button className="modal-close" onClick={cancelNetworkSwitch}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="confirm-text">
                You are about to switch from <strong>{currentNetwork === 'bitcoin' ? 'Bitcoin' : 'SigNet'}</strong> to{' '}
                <strong>{targetNetwork === 'bitcoin' ? 'Bitcoin' : 'SigNet'}</strong>.
              </p>
              <p className="confirm-text">
                Your wallet will be reconnected with the new network configuration.
              </p>

              {switchError && (
                <div className="error-message" style={{ marginTop: '1rem' }}>
                  {switchError}
                </div>
              )}

              <div className="info-box" style={{ marginTop: '1rem' }}>
                <p className="info-text">
                  ℹ️ Note: The same Bitcoin keys will be used on both networks. Only the server endpoints change.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelNetworkSwitch} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmNetworkSwitch} disabled={loading}>
                {loading ? 'Switching...' : 'Switch Network'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Private Key Modal */}
      {showBackupModal && privateKeyData && (
        <div className="modal-overlay" onClick={closeBackupModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🔐 Private Key Backup</h2>
              <button className="modal-close" onClick={closeBackupModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="warning-box" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#856404', fontWeight: 600 }}>
                  ⚠️ WARNING: Keep this private key safe!
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#856404' }}>
                  Anyone with access to your private key can steal all your funds.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 600, color: '#495057' }}>Hex Format</label>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => copyToClipboard(privateKeyData.hex, 'hex')}
                  >
                    {copiedField === 'hex' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <code style={{
                  display: 'block',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}>
                  {privateKeyData.hex}
                </code>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 600, color: '#495057' }}>nsec Format (Nostr)</label>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => copyToClipboard(privateKeyData.nsec, 'nsec')}
                  >
                    {copiedField === 'nsec' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <code style={{
                  display: 'block',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}>
                  {privateKeyData.nsec}
                </code>
              </div>

              <div className="info-box" style={{ marginTop: '1.5rem' }}>
                <p className="info-text" style={{ fontSize: '0.85rem' }}>
                  💡 Tip: Write down your private key on paper and store it in a secure location. Never save it digitally or share it via email/messaging.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeBackupModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
