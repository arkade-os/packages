import React, { useState } from 'react';
import { useMetaMask, type SupportedNetwork } from './MetaMaskProvider';
import './Settings.css';
import './Modal.css';

export const Settings: React.FC = () => {
  const { currentNetwork, networkConfig, switchNetwork, loading } = useMetaMask();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetNetwork, setTargetNetwork] = useState<SupportedNetwork | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

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
            <div className="setting-label">Arkade Server</div>
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
    </div>
  );
};
