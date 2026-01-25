import React from 'react';
import { SwapCard } from './SwapCard';
import { useSwap } from '../hooks/useSwap';

interface SwapTabProps {
  currentNetwork: string;
  sendBitcoin: (toAddress: string, amount: number) => Promise<string>;
  arkadeAddress?: string;
  balance?: number | null;
}

export const SwapTab: React.FC<SwapTabProps> = ({
  currentNetwork,
  sendBitcoin,
  arkadeAddress,
  balance,
}) => {
  const swap = useSwap({
    currentNetwork,
    sendBitcoin,
    arkadeAddress,
  });

  return <SwapCard swap={swap} balance={balance} />;
};
