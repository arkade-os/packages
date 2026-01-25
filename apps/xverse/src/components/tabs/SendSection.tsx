import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { colors, borderRadius, spacing, baseStyles } from '../styles';

interface SendSectionProps {
  onSend: (toAddress: string, amount: number) => Promise<string>;
  isLoading: boolean;
}

export const SendSection: React.FC<SendSectionProps> = ({ onSend, isLoading }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = async () => {
    const sats = parseInt(amount);
    if (!sats || sats <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!address) {
      alert('Please enter a recipient address');
      return;
    }

    try {
      const txid = await onSend(address, sats);
      alert(`Transaction sent! TXID: ${txid}`);
      setAddress('');
      setAmount('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div style={styles.section}>
      <h3 style={baseStyles.sectionTitle}>Send Bitcoin</h3>
      <div style={styles.form}>
        <input
          type="text"
          placeholder="Recipient address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={baseStyles.input}
        />
        <input
          type="number"
          placeholder="Amount (sats)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={baseStyles.input}
        />
        <button onClick={handleSend} disabled={isLoading} style={baseStyles.buttonPrimary}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.md,
  },
};
