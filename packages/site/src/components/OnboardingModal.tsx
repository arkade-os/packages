import React, { useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import './Modal.css';

interface OnboardingModalProps {
  onClose: () => void;
  boardingAmount: number;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onClose, boardingAmount }) => {
  const { onboardFunds, loading } = useMetaMask();
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txid, setTxid] = useState<string | null>(null);

  const formatSats = (amount: number | bigint) => {
    return BigInt(amount).toLocaleString();
  };

  const handleOnboard = async () => {
    setError(null);
    try {
      setOnboarding(true);
      const transactionId = await onboardFunds();
      setTxid(transactionId);
      setSuccess(true);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to finalize boarding');
    } finally {
      setOnboarding(false);
    }
  };

  const handleClose = () => {
    if (success) {
      window.location.reload();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🚀 Finalize Boarding</h2>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {!success ? (
            <>
              <div className="info-box" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: '2px solid #A78BFA' }}>
                <p className="info-text" style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>
                  You have incoming on-chain funds ready to be converted to instant VTXOs!
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💰</span>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>
                      Boarding Balance
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--purple-dark)' }}>
                      {formatSats(boardingAmount)} sats
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--gray-900)' }}>
                  What happens next?
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--gray-700)', lineHeight: '1.6' }}>
                  <li>Your on-chain Bitcoin will be converted to VTXOs</li>
                  <li>VTXOs enable instant, off-chain transactions</li>
                  <li>Once finalized, you can send Bitcoin instantly</li>
                  <li>This process completes in the next Ark round</li>
                </ul>
              </div>

              {error && (
                <div className="error-message" style={{ marginTop: '1rem' }}>
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="invoice-success">
              <div className="invoice-success-icon">✅</div>
              <h3 className="invoice-success-title">Boarding Finalized!</h3>
              <p style={{ color: 'var(--gray-600)', marginTop: '0.75rem', marginBottom: '1rem' }}>
                Your funds are being converted to VTXOs.
              </p>
              {txid && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--white)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    Transaction ID
                  </div>
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--gray-900)' }}>
                    {txid}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!success ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={onboarding || loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOnboard}
                disabled={onboarding || loading}
              >
                {onboarding ? (
                  <>
                    <span className="loading-spinner animate-pulse">↻</span>
                    Finalizing...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Finalize Boarding
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-block"
              onClick={handleClose}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
