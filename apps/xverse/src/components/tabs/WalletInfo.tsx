import React from 'react';
import type { CSSProperties } from 'react';
import { colors, borderRadius, spacing, baseStyles } from '../styles';

interface WalletInfoProps {
  arkAddress?: string;
  boardingAddress?: string;
  paymentAddress?: string;
  ordinalsAddress?: string;
}

export const WalletInfo: React.FC<WalletInfoProps> = ({
  arkAddress,
  boardingAddress,
  paymentAddress,
  ordinalsAddress,
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Address copied!');
  };

  return (
    <div style={styles.section}>
      <h3 style={baseStyles.sectionTitle}>Wallet Addresses</h3>
      <div style={styles.list}>
        {arkAddress && (
          <div style={styles.item}>
            <div style={styles.label}>Ark Address</div>
            <div style={styles.row}>
              <code style={styles.code}>{arkAddress}</code>
              <button onClick={() => copyToClipboard(arkAddress)} style={styles.copyButton}>
                Copy
              </button>
            </div>
          </div>
        )}
        {boardingAddress && (
          <div style={styles.item}>
            <div style={styles.label}>Boarding Address</div>
            <div style={styles.row}>
              <code style={styles.code}>{boardingAddress}</code>
              <button onClick={() => copyToClipboard(boardingAddress)} style={styles.copyButton}>
                Copy
              </button>
            </div>
          </div>
        )}
        {paymentAddress && (
          <div style={styles.item}>
            <div style={styles.label}>Payment Address</div>
            <div style={styles.row}>
              <code style={styles.code}>{paymentAddress}</code>
              <button onClick={() => copyToClipboard(paymentAddress)} style={styles.copyButton}>
                Copy
              </button>
            </div>
          </div>
        )}
        {ordinalsAddress && (
          <div style={styles.item}>
            <div style={styles.label}>Ordinals Address</div>
            <div style={styles.row}>
              <code style={styles.code}>{ordinalsAddress}</code>
              <button onClick={() => copyToClipboard(ordinalsAddress)} style={styles.copyButton}>
                Copy
              </button>
            </div>
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
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.textSecondary,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  code: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.sm,
    fontSize: '11px',
    wordBreak: 'break-all' as const,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: '6px 12px',
    fontSize: '11px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
