import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useArkadeWallet } from '@arkade-os/sats-connect-react';
import { SwapTab, WalletTab } from './tabs';
import { colors, spacing, tabStyles } from './styles';

type TabType = 'swap' | 'wallet';

export const Dashboard: React.FC = () => {
  const {
    walletInfo,
    balance,
    isLoading,
    error,
    getBalance,
    sendBitcoin,
    onboardFunds,
    payLightningInvoice,
    createLightningInvoice,
    currentNetwork,
  } = useArkadeWallet();

  const [activeTab, setActiveTab] = useState<TabType>('swap');

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (walletInfo) {
      const interval = setInterval(() => {
        getBalance({ silent: true }).catch(() => {});
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [walletInfo, getBalance]);

  if (!walletInfo) {
    return null;
  }

  return (
    <div style={styles.dashboard}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Arkade Wallet</h2>
        <div style={styles.networkBadge}>Network: {currentNetwork}</div>
      </div>

      {/* Error display */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Tab Navigation */}
      <div style={tabStyles.container}>
        <button
          onClick={() => setActiveTab('swap')}
          style={{
            ...tabStyles.tab,
            ...(activeTab === 'swap' ? tabStyles.tabActive : tabStyles.tabInactive),
          }}
        >
          Swap
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          style={{
            ...tabStyles.tab,
            ...(activeTab === 'wallet' ? tabStyles.tabActive : tabStyles.tabInactive),
          }}
        >
          Wallet
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'swap' ? (
        <SwapTab
          currentNetwork={currentNetwork}
          sendBitcoin={sendBitcoin}
          arkadeAddress={walletInfo.arkAddress}
          balance={balance?.offchain ?? null}
        />
      ) : (
        <WalletTab
          walletInfo={walletInfo}
          balance={balance}
          isLoading={isLoading}
          currentNetwork={currentNetwork}
          getBalance={getBalance}
          onboardFunds={onboardFunds}
          sendBitcoin={sendBitcoin}
          payLightningInvoice={payLightningInvoice}
          createLightningInvoice={createLightningInvoice}
        />
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  dashboard: {
    maxWidth: 800,
    margin: '0 auto',
    padding: spacing.lg,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: colors.text,
  },
  networkBadge: {
    padding: '8px 16px',
    backgroundColor: colors.inputBg,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.textSecondary,
  },
  error: {
    padding: spacing.md,
    backgroundColor: colors.errorBg,
    color: colors.error,
    borderRadius: '8px',
    marginBottom: spacing.lg,
  },
};
