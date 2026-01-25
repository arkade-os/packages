import React from 'react';
import type { CSSProperties } from 'react';
import type { QuoteResponse } from '@lendasat/lendaswap-sdk';
import { colors, borderRadius, spacing } from '../styles';

interface SwapDetailsProps {
  quote: QuoteResponse;
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ quote }) => {
  const formatSats = (value?: bigint | number | null) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'bigint') return `${value.toString()} sats`;
    return `${value.toLocaleString()} sats`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Exchange rate</span>
        <span style={styles.value}>{quote.exchangeRate}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Protocol fee</span>
        <span style={styles.value}>{formatSats(quote.protocolFee)}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Network fee</span>
        <span style={styles.value}>{formatSats(quote.networkFee)}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Min / Max</span>
        <span style={styles.value}>
          {formatSats(quote.minAmount)} — {formatSats(quote.maxAmount)}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    color: colors.text,
    fontWeight: 500,
  },
};
