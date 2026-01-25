import React from 'react';
import type { CSSProperties } from 'react';
import { colors, borderRadius, spacing, baseStyles, formatSats } from '../styles';

interface BalanceData {
  total: number;
  onchain: number;
  offchain: number;
  settled: number;
}

interface BalanceCardsProps {
  balance: BalanceData | null;
  isLoading: boolean;
  onRefresh: (options?: { silent?: boolean }) => Promise<void>;
  onOnboard?: () => Promise<string>;
}

export const BalanceCards: React.FC<BalanceCardsProps> = ({
  balance,
  isLoading,
  onRefresh,
  onOnboard,
}) => {
  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h3 style={baseStyles.sectionTitle}>Balance</h3>
        <button
          onClick={() => onRefresh()}
          disabled={isLoading}
          style={baseStyles.buttonSecondary}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {balance && (
        <>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.label}>Total</div>
              <div style={styles.value}>{formatSats(balance.total)}</div>
            </div>
            <div style={styles.card}>
              <div style={styles.label}>On-chain</div>
              <div style={styles.value}>{formatSats(balance.onchain)}</div>
            </div>
            <div style={styles.card}>
              <div style={styles.label}>Off-chain (VTXOs)</div>
              <div style={styles.value}>{formatSats(balance.offchain)}</div>
            </div>
            <div style={styles.card}>
              <div style={styles.label}>Settled</div>
              <div style={styles.value}>{formatSats(balance.settled)}</div>
            </div>
          </div>

          {balance.onchain > 0 && onOnboard && (
            <div style={styles.onboardBanner}>
              <p style={styles.onboardText}>
                You have {formatSats(balance.onchain)} in your boarding address.
              </p>
              <button onClick={onOnboard} disabled={isLoading} style={baseStyles.buttonPrimary}>
                {isLoading ? 'Onboarding...' : 'Onboard Funds to VTXOs'}
              </button>
            </div>
          )}
        </>
      )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
  },
  label: {
    fontSize: '13px',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.text,
  },
  onboardBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
  },
  onboardText: {
    margin: 0,
    marginBottom: spacing.sm,
    fontSize: '14px',
    color: colors.text,
  },
};
