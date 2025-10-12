import React from 'react';
import { ARK_SERVER_URL, ESPLORA_URL, BOLTZ_URL, NETWORK } from './MetaMaskProvider';
import './Settings.css';

export const Settings: React.FC = () => {
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
              <span className="network-badge">
                {NETWORK === 'signet' ? 'SigNet' : 'Bitcoin'}
              </span>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Ark Server</div>
            <div className="setting-value">
              <code className="setting-code">{ARK_SERVER_URL}</code>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Esplora API</div>
            <div className="setting-value">
              <code className="setting-code">{ESPLORA_URL}</code>
            </div>
          </div>
          <div className="setting-item">
            <div className="setting-label">Boltz Swap API</div>
            <div className="setting-value">
              <code className="setting-code">{BOLTZ_URL}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Lightning History */}
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
    </div>
  );
};
