import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const SNAP_ID = 'local:http://localhost:8080';

interface MetaMaskContextType {
  isFlask: boolean;
  isSnapInstalled: boolean;
  isConnected: boolean;
  walletInfo: any | null;
  balance: any | null;
  transactions: any[];
  loading: boolean;
  error: string | null;
  connectSnap: () => Promise<void>;
  getWallet: () => Promise<void>;
  createWallet: (network?: string) => Promise<void>;
  getBalance: () => Promise<void>;
  sendBitcoin: (to: string, amount: number) => Promise<void>;
  getTransactionHistory: () => Promise<void>;
  payLightningInvoice: (invoice: string) => Promise<void>;
  createLightningInvoice: (amount: number, description?: string) => Promise<any>;
  resetWallet: () => Promise<void>;
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

export const useMetaMask = () => {
  const context = useContext(MetaMaskContext);
  if (!context) {
    throw new Error('useMetaMask must be used within MetaMaskProvider');
  }
  return context;
};

interface MetaMaskProviderProps {
  children: ReactNode;
}

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  const [isFlask, setIsFlask] = useState(false);
  const [isSnapInstalled, setIsSnapInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any | null>(null);
  const [balance, setBalance] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkFlask();
    checkSnapInstalled();
  }, []);

  // Auto-connect if snap is installed
  useEffect(() => {
    const autoConnect = async () => {
      if (isSnapInstalled && !isConnected && !walletInfo) {
        try {
          // Just check wallet status without connecting
          await getWallet();
        } catch (err) {
          console.log('Auto-connect skipped:', err);
        }
      }
    };

    autoConnect();
  }, [isSnapInstalled]);

  const checkFlask = async () => {
    const provider = (window as any).ethereum;
    if (!provider) {
      setError('MetaMask is not installed');
      return;
    }

    try {
      const clientVersion = await provider.request({
        method: 'web3_clientVersion',
      });

      setIsFlask(clientVersion.includes('flask'));
    } catch (err) {
      console.error('Error checking Flask:', err);
    }
  };

  const checkSnapInstalled = async () => {
    try {
      const provider = (window as any).ethereum;
      if (!provider) return;

      const snaps = await provider.request({
        method: 'wallet_getSnaps',
      });

      setIsSnapInstalled(!!snaps[SNAP_ID]);
    } catch (err) {
      console.error('Error checking snap:', err);
    }
  };

  const connectSnap = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = (window as any).ethereum;
      if (!provider) {
        throw new Error('MetaMask is not installed');
      }

      // Check if snap is already installed first
      const snaps = await provider.request({
        method: 'wallet_getSnaps',
      });

      if (snaps[SNAP_ID]) {
        // Snap already installed, just get wallet info
        setIsSnapInstalled(true);
        setIsConnected(true);
        await getWallet();
      } else {
        // Install snap
        await provider.request({
          method: 'wallet_requestSnaps',
          params: {
            [SNAP_ID]: {},
          },
        });

        setIsSnapInstalled(true);
        setIsConnected(true);

        // Check if wallet already exists
        await getWallet();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect snap');
      console.error('Error connecting snap:', err);
    } finally {
      setLoading(false);
    }
  };

  const invokeSnap = async (method: string, params?: any) => {
    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error('MetaMask is not installed');
    }

    const response = await provider.request({
      method: 'wallet_invokeSnap',
      params: {
        snapId: SNAP_ID,
        request: {
          method,
          params,
        },
      },
    });

    return response;
  };

  const getWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await invokeSnap('arkade_getWallet');

      if (response.success && response.data) {
        setWalletInfo(response.data);
        setIsConnected(true);
        // Also fetch balance if wallet exists
        await getBalance();
      } else {
        setWalletInfo(null);
        // If no wallet but snap is connected, we're in the "create wallet" state
        setIsConnected(true);
      }
    } catch (err: any) {
      // Don't show error for "no wallet found" - this is expected
      if (!err.message || !err.message.includes('No wallet found')) {
        setError(err.message || 'Failed to get wallet');
        console.error('Error getting wallet:', err);
      }
      setWalletInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async (network: string = 'testnet') => {
    try {
      setLoading(true);
      setError(null);

      const response = await invokeSnap('arkade_createWallet', { network });

      if (response.success) {
        setWalletInfo(response.data);
        await getBalance();
      } else {
        throw new Error(response.message || 'Failed to create wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
      console.error('Error creating wallet:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async () => {
    try {
      const response = await invokeSnap('arkade_getBalance');

      if (response.success) {
        setBalance(response.data);
      }
    } catch (err: any) {
      console.error('Error getting balance:', err);
    }
  };

  const sendBitcoin = async (to: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await invokeSnap('arkade_send', { to, amount });

      if (response.success) {
        await getBalance();
        await getTransactionHistory();
      } else {
        throw new Error(response.message || 'Failed to send transaction');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
      console.error('Error sending transaction:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTransactionHistory = async () => {
    try {
      const response = await invokeSnap('arkade_getTransactionHistory');

      if (response.success) {
        setTransactions(response.data);
      }
    } catch (err: any) {
      console.error('Error getting transaction history:', err);
    }
  };

  const payLightningInvoice = async (invoice: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await invokeSnap('arkade_payLightningInvoice', { invoice });

      if (response.success) {
        await getBalance();
        await getTransactionHistory();
      } else {
        throw new Error(response.message || 'Failed to pay invoice');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pay invoice');
      console.error('Error paying invoice:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createLightningInvoice = async (amount: number, description?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await invokeSnap('arkade_createLightningInvoice', { amount, description });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create invoice');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
      console.error('Error creating invoice:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await invokeSnap('arkade_resetWallet');

      if (response.success) {
        setWalletInfo(null);
        setBalance(null);
        setTransactions([]);
      } else {
        throw new Error(response.message || 'Failed to reset wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset wallet');
      console.error('Error resetting wallet:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: MetaMaskContextType = {
    isFlask,
    isSnapInstalled,
    isConnected,
    walletInfo,
    balance,
    transactions,
    loading,
    error,
    connectSnap,
    getWallet,
    createWallet,
    getBalance,
    sendBitcoin,
    getTransactionHistory,
    payLightningInvoice,
    createLightningInvoice,
    resetWallet,
  };

  return <MetaMaskContext.Provider value={value}>{children}</MetaMaskContext.Provider>;
};
