import React, { useState } from 'react';
import { useMetaMask } from './MetaMaskProvider';
import './Modal.css';

interface ReceiveModalProps {
  onClose: () => void;
}

type ReceiveMethod = 'arkade' | 'lightning' | null;

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ onClose }) => {
  const { walletInfo, createLightningInvoice, loading, networkConfig } = useMetaMask();
  const [method, setMethod] = useState<ReceiveMethod>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateInvoice = async () => {
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const amountSats = Math.floor(parseFloat(amount) * 100000000);
      const result = await createLightningInvoice(amountSats, description || 'Arkade wallet payment');
      setGeneratedInvoice(result);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 24) return address;
    return `${address.slice(0, 12)}...${address.slice(-12)}`;
  };

  const renderMethodSelector = () => (
    <div className="method-selector">
      <p className="method-selector-title">Choose how you want to receive:</p>
      <div className="method-buttons">
        <button
          className="method-btn"
          onClick={() => setMethod('arkade')}
        >
          <div className="method-icon">⚡</div>
          <div className="method-info">
            <div className="method-name">Arkade</div>
            <div className="method-description">Receive to your Ark or Boarding address</div>
          </div>
        </button>
        {networkConfig.hasLightning && (
          <button
            className="method-btn"
            onClick={() => setMethod('lightning')}
          >
            <div className="method-icon">⚡</div>
            <div className="method-info">
              <div className="method-name">Lightning</div>
              <div className="method-description">Create Lightning invoice</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  const renderArkadeAddresses = () => (
    <>
      <div className="receive-address-section">
        <div className="receive-address-card">
          <div className="receive-address-header">
            <span className="receive-address-label">⚡ Ark Address</span>
            <span className="receive-address-badge">Instant</span>
          </div>
          <div className="receive-address-value">
            <code>{formatAddress(walletInfo?.arkAddress)}</code>
          </div>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => copyToClipboard(walletInfo?.arkAddress)}
          >
            📋 Copy Address
          </button>
          <p className="receive-address-description">
            Use this address to receive instant off-chain Bitcoin via Ark VTXOs
          </p>
        </div>

        <div className="receive-address-card">
          <div className="receive-address-header">
            <span className="receive-address-label">🔗 Boarding Address</span>
            <span className="receive-address-badge">On-chain</span>
          </div>
          <div className="receive-address-value">
            <code>{formatAddress(walletInfo?.boardingAddress)}</code>
          </div>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => copyToClipboard(walletInfo?.boardingAddress)}
          >
            📋 Copy Address
          </button>
          <p className="receive-address-description">
            Use this address for your first deposit or receiving from exchanges
          </p>
        </div>
      </div>
    </>
  );

  const renderLightningForm = () => {
    if (generatedInvoice) {
      return (
        <div className="invoice-result">
          <div className="invoice-success">
            <div className="invoice-success-icon">✅</div>
            <h3 className="invoice-success-title">Lightning Invoice Created</h3>
          </div>

          <div className="invoice-details">
            <div className="invoice-detail-item">
              <span className="invoice-detail-label">Amount</span>
              <span className="invoice-detail-value">{generatedInvoice.amount} sats</span>
            </div>
            <div className="invoice-detail-item">
              <span className="invoice-detail-label">Expires in</span>
              <span className="invoice-detail-value">{generatedInvoice.expiry} seconds</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Invoice</label>
            <textarea
              className="form-input form-textarea"
              value={generatedInvoice.invoice}
              readOnly
              rows={4}
            />
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => copyToClipboard(generatedInvoice.invoice)}
          >
            📋 Copy Invoice
          </button>

          <div className="info-box">
            <p className="info-text">
              Share this invoice to receive payment. Funds will automatically appear in your Arkade wallet when paid.
            </p>
          </div>

          <button
            className="btn btn-secondary btn-block"
            onClick={() => {
              setGeneratedInvoice(null);
              setAmount('');
              setDescription('');
            }}
          >
            Create Another Invoice
          </button>
        </div>
      );
    }

    return (
      <>
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

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Description (optional)
          </label>
          <input
            id="description"
            type="text"
            className="form-input"
            placeholder="Payment for..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="info-box">
          <p className="info-text">
            ⚡ Create a Lightning invoice that deposits to your Arkade wallet via reverse swap.
          </p>
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handleCreateInvoice}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {method !== null && !generatedInvoice && (
            <button className="modal-back" onClick={() => setMethod(null)} disabled={loading}>
              ←
            </button>
          )}
          <h2 className="modal-title">
            {method === null && '📥 Receive'}
            {method === 'arkade' && '⚡ Receive via Arkade'}
            {method === 'lightning' && '⚡ Create Lightning Invoice'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {method === null && renderMethodSelector()}
          {method === 'arkade' && renderArkadeAddresses()}
          {method === 'lightning' && renderLightningForm()}
        </div>
      </div>
    </div>
  );
};
