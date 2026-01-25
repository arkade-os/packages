import React from 'react';
import type { CSSProperties } from 'react';
import { BalanceCards } from './BalanceCards';
import { SendSection } from './SendSection';
import { LightningSection } from './LightningSection';
import { VTXOList } from './VTXOList';
import { WalletInfo } from './WalletInfo';
import { spacing } from '../styles';

interface WalletTabProps {
  walletInfo: {
    arkAddress?: string;
    boardingAddress?: string;
    paymentAddress?: string;
    ordinalsAddress?: string;
  } | null;
  balance: {
    total: number;
    onchain: number;
    offchain: number;
    settled: number;
    vtxoList: Array<{ id: string; amount: number; status: string }>;
  } | null;
  isLoading: boolean;
  currentNetwork: string;
  getBalance: (options?: { silent?: boolean }) => Promise<void>;
  onboardFunds: () => Promise<string>;
  sendBitcoin: (toAddress: string, amount: number) => Promise<string>;
  payLightningInvoice: (invoice: string) => Promise<string>;
  createLightningInvoice: (amount: number, description?: string) => Promise<string>;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  walletInfo,
  balance,
  isLoading,
  currentNetwork,
  getBalance,
  onboardFunds,
  sendBitcoin,
  payLightningInvoice,
  createLightningInvoice,
}) => {
  return (
    <div style={styles.container}>
      <BalanceCards
        balance={balance}
        isLoading={isLoading}
        onRefresh={getBalance}
        onOnboard={balance && balance.onchain > 0 ? onboardFunds : undefined}
      />

      <SendSection onSend={sendBitcoin} isLoading={isLoading} />

      {currentNetwork === 'bitcoin' && (
        <LightningSection
          onPayInvoice={payLightningInvoice}
          onCreateInvoice={createLightningInvoice}
          isLoading={isLoading}
        />
      )}

      {balance && balance.vtxoList.length > 0 && <VTXOList vtxos={balance.vtxoList} />}

      {walletInfo && (
        <WalletInfo
          arkAddress={walletInfo.arkAddress}
          boardingAddress={walletInfo.boardingAddress}
          paymentAddress={walletInfo.paymentAddress}
          ordinalsAddress={walletInfo.ordinalsAddress}
        />
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
    maxWidth: 600,
    margin: '0 auto',
  },
};
