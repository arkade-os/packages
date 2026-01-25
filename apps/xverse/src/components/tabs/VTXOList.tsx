import React from 'react';
import type { CSSProperties } from 'react';
import { colors, borderRadius, spacing, baseStyles, formatSats } from '../styles';

interface VTXO {
  id: string;
  amount: number;
  status: string;
}

interface VTXOListProps {
  vtxos: VTXO[];
}

export const VTXOList: React.FC<VTXOListProps> = ({ vtxos }) => {
  if (!vtxos.length) return null;

  return (
    <div style={styles.section}>
      <h3 style={baseStyles.sectionTitle}>VTXOs ({vtxos.length})</h3>
      <div style={styles.list}>
        {vtxos.map((vtxo) => (
          <div key={vtxo.id} style={styles.card}>
            <div style={styles.cardMain}>
              <strong style={styles.amount}>{formatSats(vtxo.amount)}</strong>
              <span style={styles.status}>{vtxo.status}</span>
            </div>
            <div style={styles.id}>{vtxo.id.substring(0, 16)}...</div>
          </div>
        ))}
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
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
  },
  cardMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: '14px',
    color: colors.text,
  },
  status: {
    padding: '2px 8px',
    backgroundColor: colors.success,
    color: '#fff',
    borderRadius: borderRadius.sm,
    fontSize: '11px',
    fontWeight: 600,
  },
  id: {
    marginTop: spacing.xs,
    fontSize: '11px',
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
};
