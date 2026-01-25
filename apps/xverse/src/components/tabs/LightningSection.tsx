import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, borderRadius, spacing, baseStyles } from '../styles';

interface LightningSectionProps {
  onPayInvoice: (invoice: string) => Promise<string>;
  onCreateInvoice: (amount: number, description?: string) => Promise<string>;
  isLoading: boolean;
}

export const LightningSection: React.FC<LightningSectionProps> = ({
  onPayInvoice,
  onCreateInvoice,
  isLoading,
}) => {
  const [payInvoice, setPayInvoice] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState('');

  const handlePayInvoice = async () => {
    if (!payInvoice) {
      alert('Please enter a Lightning invoice');
      return;
    }

    try {
      const preimage = await onPayInvoice(payInvoice);
      alert(`Invoice paid! Preimage: ${preimage}`);
      setPayInvoice('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateInvoice = async () => {
    const amount = parseInt(receiveAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const invoice = await onCreateInvoice(amount, 'Arkade payment');
      setCreatedInvoice(invoice);
      alert('Invoice created! It will auto-claim when paid.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div style={styles.section}>
      <h3 style={baseStyles.sectionTitle}>Lightning Network</h3>

      <div style={styles.subsection}>
        <h4 style={styles.subtitle}>Pay Invoice</h4>
        <div style={styles.form}>
          <input
            type="text"
            placeholder="Lightning invoice (lnbc...)"
            value={payInvoice}
            onChange={(e) => setPayInvoice(e.target.value)}
            style={baseStyles.input}
          />
          <button onClick={handlePayInvoice} disabled={isLoading} style={baseStyles.buttonPrimary}>
            {isLoading ? 'Paying...' : 'Pay Invoice'}
          </button>
        </div>
      </div>

      <div style={styles.subsection}>
        <h4 style={styles.subtitle}>Create Invoice</h4>
        <div style={styles.form}>
          <input
            type="number"
            placeholder="Amount (sats)"
            value={receiveAmount}
            onChange={(e) => setReceiveAmount(e.target.value)}
            style={baseStyles.input}
          />
          <button
            onClick={handleCreateInvoice}
            disabled={isLoading}
            style={baseStyles.buttonPrimary}
          >
            {isLoading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>

        {createdInvoice && (
          <div style={styles.invoiceResult}>
            <strong>Created Invoice:</strong>
            <code style={styles.invoiceCode}>{createdInvoice}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdInvoice);
                alert('Invoice copied to clipboard!');
              }}
              style={baseStyles.buttonSecondary}
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  section: {
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  subsection: {
    marginTop: spacing.lg,
  },
  subtitle: {
    margin: 0,
    marginBottom: spacing.sm,
    fontSize: '14px',
    fontWeight: 600,
    color: colors.textSecondary,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  invoiceResult: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  invoiceCode: {
    padding: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.sm,
    fontSize: '11px',
    wordBreak: 'break-all' as const,
    fontFamily: 'monospace',
  },
};
