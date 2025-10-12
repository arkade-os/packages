import React, { useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import './Modal.css';

interface LightningModalProps {
  onClose: () => void;
}

export const LightningModal: React.FC<LightningModalProps> = ({ onClose }) => {
  const { payLightningInvoice, loading } = useMetaMask();
  const [invoice, setInvoice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚡ Pay Lightning Invoice</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
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
            <p className="info-text">
              The invoice will be decoded and you'll be prompted to confirm the payment details.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handlePay} disabled={loading}>
            {loading ? 'Processing...' : 'Pay Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};
