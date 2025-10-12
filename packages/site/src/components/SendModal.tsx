import React, { useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import './Modal.css';

interface SendModalProps {
  onClose: () => void;
}

type SendMethod = 'arkade' | 'lightning' | null;

export const SendModal: React.FC<SendModalProps> = ({ onClose }) => {
  const { sendBitcoin, payLightningInvoice, loading } = useMetaMask();
  const [method, setMethod] = useState<SendMethod>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSendArkade = async () => {
    setError(null);

    if (!recipient) {
      setError('Please enter a recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const amountSats = Math.floor(parseFloat(amount) * 100000000);
      await sendBitcoin(recipient, amountSats);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
    }
  };

  const handleSendLightning = async () => {
    setError(null);

    if (!invoice) {
      setError('Please enter a Lightning invoice');
      return;
    }

    if (!invoice.toLowerCase().startsWith('lnbc') && !invoice.toLowerCase().startsWith('lntb')) {
      setError('Invalid Lightning invoice format');
      return;
    }

    try {
      await payLightningInvoice(invoice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to pay Lightning invoice');
    }
  };

  const renderMethodSelector = () => (
    <div className="method-selector">
      <p className="method-selector-title">Choose how you want to send:</p>
      <div className="method-buttons">
        <button
          className="method-btn"
          onClick={() => setMethod('arkade')}
        >
          <div className="method-icon">⚡</div>
          <div className="method-info">
            <div className="method-name">Arkade</div>
            <div className="method-description">Send to Bitcoin address via VTXOs</div>
          </div>
        </button>
        <button
          className="method-btn"
          onClick={() => setMethod('lightning')}
        >
          <div className="method-icon">⚡</div>
          <div className="method-info">
            <div className="method-name">Lightning</div>
            <div className="method-description">Pay Lightning invoice</div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderArkadeForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="recipient" className="form-label">
          Recipient Address
        </label>
        <input
          id="recipient"
          type="text"
          className="form-input"
          placeholder="Enter Ark or Bitcoin address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="amount" className="form-label">
          Amount (BTC)
        </label>
        <input
          id="amount"
          type="number"
          step="0.00000001"
          className="form-input"
          placeholder="0.00000000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="info-box">
        <p className="info-text">
          ⚡ Transactions are sent via the Ark protocol for instant, low-fee settlement.
        </p>
      </div>
    </>
  );

  const renderLightningForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="invoice" className="form-label">
          Lightning Invoice
        </label>
        <textarea
          id="invoice"
          className="form-input form-textarea"
          placeholder="lnbc..."
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          rows={4}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="info-box">
        <p className="info-text">
          ⚡ Pay Lightning Network invoices using your Ark VTXOs for instant settlement.
        </p>
      </div>
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {method === null && '📤 Send'}
            {method === 'arkade' && '⚡ Send via Arkade'}
            {method === 'lightning' && '⚡ Pay Lightning Invoice'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {method === null && renderMethodSelector()}
          {method === 'arkade' && renderArkadeForm()}
          {method === 'lightning' && renderLightningForm()}
        </div>

        <div className="modal-footer">
          {method !== null && (
            <button className="btn btn-secondary" onClick={() => setMethod(null)} disabled={loading}>
              Back
            </button>
          )}
          {method === null && (
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          {method === 'arkade' && (
            <button className="btn btn-primary" onClick={handleSendArkade} disabled={loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          )}
          {method === 'lightning' && (
            <button className="btn btn-primary" onClick={handleSendLightning} disabled={loading}>
              {loading ? 'Processing...' : 'Pay Invoice'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
