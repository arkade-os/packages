import React from 'react';
import type { CSSProperties } from 'react';
import { swapStatusToString } from '@lendasat/lendaswap-sdk';
import { TokenInput } from './TokenInput';
import { SwapDetails } from './SwapDetails';
import type { UseSwapReturn } from '../hooks/useSwap';
import { colors, borderRadius, spacing, baseStyles, formatAddress } from '../styles';

interface SwapCardProps {
  swap: UseSwapReturn;
  balance?: number | null;
}

export const SwapCard: React.FC<SwapCardProps> = ({ swap, balance }) => {
  const {
    direction,
    flipDirection,
    sourceAmount,
    setSourceAmount,
    arkadeReceiveAddress,
    setArkadeReceiveAddress,
    quote,
    isQuoting,
    getQuote,
    arkadeToEvmSwap,
    evmToArkadeSwap,
    isCreatingSwap,
    createSwap,
    isFundingVhtlc,
    fundVhtlc,
    isClaimingSwap,
    claimSwap,
    isRefreshingSwap,
    refreshSwap,
    resetSwap,
    evmAddress,
    isPolygonNetwork,
    isEvmConnecting,
    evmError,
    connectMetaMask,
    disconnectEvm,
    clientStatus,
    error,
    isAvailable,
  } = swap;

  const activeSwap = direction === 'arkade-to-evm' ? arkadeToEvmSwap : evmToArkadeSwap;
  const sourceToken = direction === 'arkade-to-evm' ? 'btc' : 'usdt';
  const targetToken = direction === 'arkade-to-evm' ? 'usdt' : 'btc';

  const formatAmount = (value?: bigint | number | null) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'bigint') return value.toString();
    return value.toLocaleString();
  };

  // Calculate estimated receive amount from quote or active swap
  const receiveAmount = activeSwap
    ? formatAmount(activeSwap.target_amount)
    : quote
    ? `~${formatAmount((quote as any).targetAmount || (quote as any).target_amount)}`
    : '';

  if (!isAvailable) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Swap</h2>
        </div>
        <div style={styles.unavailable}>
          <p>Swaps are available on Bitcoin mainnet only.</p>
          <p style={styles.hint}>Switch your network to bitcoin to enable swapping.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.title}>Swap</h2>
        <div style={styles.badge}>Polygon • USDT</div>
      </div>

      {/* MetaMask Connection */}
      {!evmAddress ? (
        <div style={styles.connectSection}>
          <p style={styles.connectText}>
            {direction === 'arkade-to-evm'
              ? 'Connect MetaMask to receive USDT on Polygon'
              : 'Connect MetaMask to send USDT from Polygon'}
          </p>
          <button
            onClick={connectMetaMask}
            disabled={isEvmConnecting}
            style={baseStyles.buttonPrimary}
          >
            {isEvmConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>
          {evmError && <p style={styles.error}>{evmError}</p>}
        </div>
      ) : (
        <>
          {/* Connected wallet status */}
          <div style={styles.walletStatus}>
            <span style={styles.walletLabel}>MetaMask:</span>
            <span style={styles.walletAddress}>{formatAddress(evmAddress)}</span>
            <span style={isPolygonNetwork ? styles.networkGood : styles.networkWarn}>
              {isPolygonNetwork ? 'Polygon' : 'Wrong Network'}
            </span>
            {!isPolygonNetwork && (
              <button onClick={connectMetaMask} style={styles.switchButton}>
                Switch
              </button>
            )}
            <button onClick={disconnectEvm} style={styles.disconnectButton}>
              ×
            </button>
          </div>

          {/* Active Swap Progress */}
          {activeSwap ? (
            <div style={styles.swapProgress}>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Status</span>
                <span style={styles.statusPill}>{swapStatusToString(activeSwap.status)}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>
                  {direction === 'arkade-to-evm' ? 'Sending' : 'Sending'}
                </span>
                <span style={styles.statusValue}>
                  {formatAmount(activeSwap.source_amount)}{' '}
                  {direction === 'arkade-to-evm' ? 'sats' : 'USDT'}
                </span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Receiving</span>
                <span style={styles.statusValue}>
                  {formatAmount(activeSwap.target_amount)}{' '}
                  {direction === 'arkade-to-evm' ? 'USDT' : 'sats'}
                </span>
              </div>

              {direction === 'arkade-to-evm' && arkadeToEvmSwap?.htlc_address_arkade && (
                <div style={styles.addressBox}>
                  <span style={styles.addressLabel}>VHTLC Address</span>
                  <code style={styles.addressCode}>{arkadeToEvmSwap.htlc_address_arkade}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(arkadeToEvmSwap.htlc_address_arkade);
                      alert('Address copied!');
                    }}
                    style={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
              )}

              {direction === 'evm-to-arkade' && evmToArkadeSwap?.htlc_address_evm && (
                <div style={styles.addressBox}>
                  <span style={styles.addressLabel}>EVM HTLC Address</span>
                  <code style={styles.addressCode}>{evmToArkadeSwap.htlc_address_evm}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(evmToArkadeSwap.htlc_address_evm);
                      alert('Address copied!');
                    }}
                    style={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
              )}

              <div style={styles.actionRow}>
                {direction === 'arkade-to-evm' && (
                  <button
                    onClick={fundVhtlc}
                    disabled={isFundingVhtlc}
                    style={baseStyles.buttonPrimary}
                  >
                    {isFundingVhtlc ? 'Funding...' : 'Fund VHTLC'}
                  </button>
                )}
                <button
                  onClick={refreshSwap}
                  disabled={isRefreshingSwap}
                  style={baseStyles.buttonSecondary}
                >
                  {isRefreshingSwap ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div style={styles.actionRow}>
                <button
                  onClick={claimSwap}
                  disabled={isClaimingSwap}
                  style={baseStyles.buttonPrimary}
                >
                  {isClaimingSwap
                    ? 'Claiming...'
                    : direction === 'arkade-to-evm'
                    ? 'Claim USDT'
                    : 'Claim BTC'}
                </button>
                <button onClick={resetSwap} style={baseStyles.buttonSecondary}>
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Token Inputs */}
              <TokenInput
                label="You pay"
                token={sourceToken}
                amount={sourceAmount}
                onAmountChange={setSourceAmount}
                balance={sourceToken === 'btc' ? balance : undefined}
                onMaxClick={
                  sourceToken === 'btc' && balance
                    ? () => setSourceAmount(String(balance))
                    : undefined
                }
              />

              {/* Flip Button */}
              <div style={styles.flipContainer}>
                <button onClick={flipDirection} style={styles.flipButton}>
                  ↓
                </button>
              </div>

              <TokenInput
                label="You receive"
                token={targetToken}
                amount={receiveAmount}
                readonly
              />

              {/* Arkade receive address for EVM → Arkade */}
              {direction === 'evm-to-arkade' && (
                <div style={styles.addressInput}>
                  <label style={styles.inputLabel}>Arkade receive address</label>
                  <input
                    type="text"
                    value={arkadeReceiveAddress}
                    onChange={(e) => setArkadeReceiveAddress(e.target.value)}
                    placeholder="ark1..."
                    style={baseStyles.input}
                  />
                </div>
              )}

              {/* Quote Details */}
              {quote && <SwapDetails quote={quote} />}

              {/* Loading indicator */}
              {clientStatus === 'loading' && (
                <p style={styles.hint}>Initializing swap client...</p>
              )}

              {/* Action Buttons */}
              <div style={styles.actionRow}>
                {direction === 'arkade-to-evm' && (
                  <button
                    onClick={getQuote}
                    disabled={!sourceAmount || isQuoting || clientStatus === 'loading'}
                    style={baseStyles.buttonSecondary}
                  >
                    {isQuoting ? 'Quoting...' : 'Get Quote'}
                  </button>
                )}
                <button
                  onClick={createSwap}
                  disabled={
                    !sourceAmount ||
                    !isPolygonNetwork ||
                    isCreatingSwap ||
                    clientStatus === 'loading' ||
                    (direction === 'evm-to-arkade' && !arkadeReceiveAddress)
                  }
                  style={baseStyles.buttonPrimary}
                >
                  {isCreatingSwap ? 'Creating...' : 'Create Swap'}
                </button>
              </div>
            </>
          )}

          {/* Error display */}
          {error && <p style={styles.error}>{error}</p>}
        </>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  card: {
    maxWidth: 480,
    margin: '0 auto',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border}`,
    padding: spacing.lg,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: colors.text,
  },
  badge: {
    padding: '4px 10px',
    backgroundColor: colors.text,
    color: '#fff',
    borderRadius: borderRadius.full,
    fontSize: '11px',
    fontWeight: 600,
  },
  unavailable: {
    textAlign: 'center' as const,
    padding: spacing.xl,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: '13px',
    color: colors.textMuted,
    margin: 0,
    marginTop: spacing.sm,
  },
  connectSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: spacing.lg,
    textAlign: 'center' as const,
  },
  connectText: {
    margin: 0,
    color: colors.textSecondary,
    fontSize: '14px',
  },
  walletStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    fontSize: '13px',
  },
  walletLabel: {
    color: colors.textSecondary,
  },
  walletAddress: {
    fontWeight: 600,
    color: colors.text,
  },
  networkGood: {
    padding: '2px 8px',
    backgroundColor: colors.successBg,
    color: colors.success,
    borderRadius: borderRadius.full,
    fontSize: '11px',
    fontWeight: 600,
  },
  networkWarn: {
    padding: '2px 8px',
    backgroundColor: colors.warningBg,
    color: colors.warning,
    borderRadius: borderRadius.full,
    fontSize: '11px',
    fontWeight: 600,
  },
  switchButton: {
    padding: '2px 8px',
    fontSize: '11px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
  },
  disconnectButton: {
    marginLeft: 'auto',
    padding: '2px 8px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    border: 'none',
    cursor: 'pointer',
  },
  flipContainer: {
    display: 'flex',
    justifyContent: 'center',
    margin: '-8px 0',
    position: 'relative' as const,
    zIndex: 1,
  },
  flipButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardBg,
    border: `4px solid ${colors.inputBg}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    color: colors.textSecondary,
    transition: 'transform 0.2s',
  },
  addressInput: {
    marginTop: spacing.md,
  },
  inputLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actionRow: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  error: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.errorBg,
    color: colors.error,
    borderRadius: borderRadius.sm,
    fontSize: '13px',
    margin: 0,
  },
  swapProgress: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
  statusLabel: {
    color: colors.textSecondary,
  },
  statusValue: {
    fontWeight: 600,
    color: colors.text,
  },
  statusPill: {
    padding: '4px 10px',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    borderRadius: borderRadius.full,
    fontSize: '12px',
    fontWeight: 600,
  },
  addressBox: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  addressLabel: {
    fontSize: '12px',
    color: colors.textSecondary,
    fontWeight: 500,
  },
  addressCode: {
    fontSize: '11px',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
    color: colors.text,
  },
  copyButton: {
    alignSelf: 'flex-start',
    padding: '4px 10px',
    fontSize: '11px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
  },
};
