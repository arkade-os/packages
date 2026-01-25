import React from 'react';
import type { CSSProperties } from 'react';
import { colors, borderRadius, spacing } from '../styles';

export type TokenType = 'btc' | 'usdt';

interface TokenInputProps {
  label: string;
  token: TokenType;
  amount: string;
  onAmountChange?: (value: string) => void;
  balance?: number | null;
  onMaxClick?: () => void;
  readonly?: boolean;
  placeholder?: string;
}

const tokenInfo: Record<TokenType, { symbol: string; name: string; color: string }> = {
  btc: { symbol: 'BTC', name: 'Bitcoin (Arkade)', color: '#f7931a' },
  usdt: { symbol: 'USDT', name: 'USDT (Polygon)', color: '#26a17b' },
};

export const TokenInput: React.FC<TokenInputProps> = ({
  label,
  token,
  amount,
  onAmountChange,
  balance,
  onMaxClick,
  readonly = false,
  placeholder = '0',
}) => {
  const info = tokenInfo[token];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.label}>{label}</span>
        {balance != null && (
          <span style={styles.balance}>
            Balance: {token === 'btc' ? `${balance.toLocaleString()} sats` : balance.toLocaleString()}
            {onMaxClick && (
              <button onClick={onMaxClick} style={styles.maxButton}>
                MAX
              </button>
            )}
          </span>
        )}
      </div>
      <div style={styles.inputRow}>
        <div style={styles.tokenBadge}>
          <div style={{ ...styles.tokenIcon, backgroundColor: info.color }}>
            {info.symbol.charAt(0)}
          </div>
          <div style={styles.tokenInfo}>
            <span style={styles.tokenSymbol}>{info.symbol}</span>
            <span style={styles.tokenName}>{info.name}</span>
          </div>
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={onAmountChange ? (e) => onAmountChange(e.target.value) : undefined}
          placeholder={placeholder}
          readOnly={readonly}
          style={{
            ...styles.input,
            ...(readonly ? styles.inputReadonly : {}),
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.textSecondary,
  },
  balance: {
    fontSize: '12px',
    color: colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  },
  maxButton: {
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
  },
  inputRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  tokenBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
  },
  tokenInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  tokenSymbol: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.text,
  },
  tokenName: {
    fontSize: '11px',
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '28px',
    fontWeight: 500,
    textAlign: 'right' as const,
    outline: 'none',
    color: colors.text,
    minWidth: 0,
  },
  inputReadonly: {
    color: colors.textSecondary,
  },
};
