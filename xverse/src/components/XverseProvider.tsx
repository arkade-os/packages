/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Wallet, Ramps, type NetworkName } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';
import ArkWallet, { type SatsConnectNetwork } from '../utils/ArkWallet';

// Network configuration type
export type SupportedNetwork = 'bitcoin' | 'signet' | 'regtest';

// Network configurations
export interface NetworkConfig {
  networkName: NetworkName;
  arkServerUrl: string;
  esploraUrl: string;
  boltzUrl?: string;
  hasLightning: boolean;
  satsConnectNetwork: SatsConnectNetwork;
}

export const NETWORK_CONFIGS: Record<SupportedNetwork, NetworkConfig> = {
  bitcoin: {
    arkServerUrl: 'https://arkade.computer',
    esploraUrl: 'https://mempool.space/api',
    boltzUrl: 'https://api.ark.boltz.exchange',
    networkName: 'bitcoin',
    hasLightning: true,
    satsConnectNetwork: 'Mainnet',
  },
  signet: {
    arkServerUrl: 'https://signet.arkade.sh',
    esploraUrl: 'https://mempool.space/signet/api',
    boltzUrl: undefined, // No Boltz support for Signet
    networkName: 'signet',
    hasLightning: false,
    satsConnectNetwork: 'Signet',
  },
  regtest: {
    arkServerUrl: 'http://localhost:7070',
    esploraUrl: 'http://localhost:3000',
    boltzUrl: undefined, // No Boltz support for Signet
    networkName: 'regtest',
    hasLightning: false,
    satsConnectNetwork: 'Regtest',
  }
};

// Default network
export const DEFAULT_NETWORK: SupportedNetwork = 'bitcoin';
const AUTO_CONNECT_KEY = 'xverse:autoConnect';

interface WalletInfo {
  arkAddress: string;
  boardingAddress: string;
  paymentAddress: string;
  ordinalsAddress?: string;
  network: SupportedNetwork;
  userPubKey?: string;
}

interface Balance {
  total: number;
  onchain: number;
  offchain: number;
  settled: number;
  preconfirmed: number;
  recoverable: number;
  vtxoList: Array<{
    id: string;
    amount: number;
    expiry: number;
    status: string;
  }>;
}

interface Transaction {
  txid: string;
  amount: number;
  type: 'send' | 'receive';
  timestamp: number;
  layer: 'onchain' | 'offchain';
  status?: string;
}

interface XverseContextType {
  wallet: Wallet | null;
  walletInfo: WalletInfo | null;
  balance: Balance | null;
  transactions: Transaction[];
  isConnecting: boolean;
  isLoading: boolean;
  error: string | null;
  connectWallet: (options?: { silent?: boolean }) => Promise<void>;
  disconnectWallet: () => void;
  getBalance: (options?: { silent?: boolean }) => Promise<void>;
  sendBitcoin: (toAddress: string, amount: number) => Promise<string>;
  getTransactionHistory: () => Promise<void>;
  payLightningInvoice: (invoice: string) => Promise<string>;
  createLightningInvoice: (amount: number, description?: string) => Promise<string>;
  onboardFunds: () => Promise<string>;
  switchNetwork: (network: SupportedNetwork) => Promise<void>;
  currentNetwork: SupportedNetwork;
}

const XverseContext = createContext<XverseContextType | undefined>(undefined);

export const useXverse = () => {
  const context = useContext(XverseContext);
  if (!context) {
    throw new Error('useXverse must be used within XverseProvider');
  }
  return context;
};

interface XverseProviderProps {
  children: ReactNode;
}

export const XverseProvider: React.FC<XverseProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [arkWallet, setArkWallet] = useState<ArkWallet | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<SupportedNetwork>(DEFAULT_NETWORK);

  /**
   * Connect to Xverse wallet and create Arkade wallet instance
   */
  const connectWallet = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    setIsConnecting(true);
    if (!silent) {
      setError(null);
    }

    try {
      const networkConfig = NETWORK_CONFIGS[currentNetwork];
      const arkWalletInstance = new ArkWallet({
        arkServerUrl: networkConfig.arkServerUrl,
        esploraUrl: networkConfig.esploraUrl,
        satsConnectNetwork: networkConfig.satsConnectNetwork,
        connectMessage: 'Connect to Arkade Bitcoin Layer 2 Wallet',
      });

      const info = await arkWalletInstance.connect();
      const walletInstance = arkWalletInstance.getWallet();

      if (!walletInstance) {
        throw new Error('Failed to initialize Arkade wallet');
      }

      setArkWallet(arkWalletInstance);
      setWallet(walletInstance);
      setWalletInfo({
        arkAddress: info.arkAddress,
        boardingAddress: info.boardingAddress,
        paymentAddress: info.paymentAddress,
        ordinalsAddress: info.ordinalAddress,
        network: currentNetwork,
        userPubKey: info.userPubKey,
      });

      await fetchBalance(arkWalletInstance);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTO_CONNECT_KEY, '1');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to connect to Xverse wallet');
      }
      setArkWallet(null);
      setWallet(null);
      setWalletInfo(null);
      setBalance(null);
    } finally {
      setIsConnecting(false);
    }
  }, [currentNetwork]);

  /**
   * Disconnect wallet and clear state
   */
  const disconnectWallet = useCallback(() => {
    arkWallet?.reset();
    setArkWallet(null);
    setWallet(null);
    setWalletInfo(null);
    setBalance(null);
    setTransactions([]);
    setError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTO_CONNECT_KEY);
    }
  }, [arkWallet]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (wallet || isConnecting) {
      return;
    }
    if (window.localStorage.getItem(AUTO_CONNECT_KEY) !== '1') {
      return;
    }
    connectWallet({ silent: true }).catch(() => {});
  }, [wallet, isConnecting, connectWallet]);

  /**
   * Helper function to fetch balance
   */
  const fetchBalance = async (arkWalletInstance: ArkWallet): Promise<Balance> => {
    const bal = await arkWalletInstance.getBalance();
    const vtxos = await arkWalletInstance.getVtxos();
    const boardingUtxos = await arkWalletInstance.getBoardingUtxos();

    // Calculate onchain balance from boarding UTXOs
    let onchainBalance = 0;
    for (const utxo of boardingUtxos) {
      onchainBalance += Number(utxo.value);
    }

    // Build VTXO list with status
    const vtxoList = vtxos.map((vtxo: any) => {
      return {
        id: vtxo.txid ? `${vtxo.txid}:${vtxo.vout}` : vtxo.id,
        amount: Number(vtxo.value || vtxo.amount),
        expiry: vtxo.expiry?.median || 0,
        status: vtxo.virtualStatus?.state || 'pending',
      };
    });

    const balanceData: Balance = {
      total: Number(bal.total) + onchainBalance,
      onchain: onchainBalance,
      offchain: Number(bal.available),
      settled: Number(bal.available), // Available = settled/spendable
      preconfirmed: 0,
      recoverable: Number(bal.total) - Number(bal.available),
      vtxoList,
    };

    setBalance(balanceData);
    return balanceData;
  };

  /**
   * Get wallet balance
   */
  const getBalance = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!arkWallet) {
      throw new Error('Wallet not connected');
    }

    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      await fetchBalance(arkWallet);
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to fetch balance');
      }
      throw err;
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [arkWallet]);

  /**
   * Send Bitcoin
   */
  const sendBitcoin = useCallback(
    async (toAddress: string, amount: number): Promise<string> => {
      if (!arkWallet) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        // Create and send transaction using the correct API
        const txid = await arkWallet.sendBitcoin(toAddress, amount);

        // Refresh balance
        await fetchBalance(arkWallet);

        return txid;
      } catch (err: any) {
        setError(err.message || 'Failed to send Bitcoin');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [arkWallet]
  );

  /**
   * Get transaction history
   */
  const getTransactionHistory = useCallback(async () => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const history = await wallet.getTransactionHistory();

      // Convert to our Transaction format
      const txList: Transaction[] = history.map((tx: any) => ({
        txid: tx.key?.arkTxid || tx.key?.boardingTxid || tx.key?.commitmentTxid || '',
        amount: Number(tx.amount),
        type: tx.type === 'sent' ? 'send' as const : 'receive' as const,
        timestamp: tx.createdAt ? tx.createdAt * 1000 : Date.now(),
        layer: tx.type === 'boarding' || tx.type === 'exit' ? 'onchain' as const : 'offchain' as const,
        status: tx.settled ? 'settled' : 'pending',
      }));

      setTransactions(txList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction history');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  /**
   * Pay Lightning invoice
   */
  const payLightningInvoice = useCallback(
    async (invoice: string): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      const networkConfig = NETWORK_CONFIGS[currentNetwork];

      if (!networkConfig.hasLightning || !networkConfig.boltzUrl) {
        throw new Error(`Lightning not supported on ${currentNetwork} network`);
      }

      setIsLoading(true);
      setError(null);

      try {
        // Create Lightning instance with correct API
        const swapProvider = new BoltzSwapProvider({
          apiUrl: networkConfig.boltzUrl,
          network: networkConfig.networkName as 'bitcoin' | 'testnet',
        });
        const lightning = new ArkadeLightning({
          wallet: wallet as any,
          swapProvider,
        });

        // Pay invoice (submarine swap: VTXO -> Lightning)
        const result = await lightning.sendLightningPayment({ invoice });

        // Refresh balance
        if (arkWallet) {
          await fetchBalance(arkWallet);
        }

        return result.preimage || '';
      } catch (err: any) {
        setError(err.message || 'Failed to pay Lightning invoice');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, arkWallet, currentNetwork]
  );

  /**
   * Create Lightning invoice
   */
  const createLightningInvoice = useCallback(
    async (amount: number, description?: string): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      const networkConfig = NETWORK_CONFIGS[currentNetwork];

      if (!networkConfig.hasLightning || !networkConfig.boltzUrl) {
        throw new Error(`Lightning not supported on ${currentNetwork} network`);
      }

      setIsLoading(true);
      setError(null);

      try {
        // Create Lightning instance with correct API
        const swapProvider = new BoltzSwapProvider({
          apiUrl: networkConfig.boltzUrl,
          network: networkConfig.networkName as 'bitcoin' | 'testnet',
        });
        const lightning = new ArkadeLightning({
          wallet: wallet as any, // Type mismatch between SDK versions
          swapProvider,
        });

        // Create invoice (reverse swap: Lightning -> VTXO)
        const result = await lightning.createLightningInvoice({
          amount,
          description: description || 'Arkade wallet payment',
        });

        // Start background process to claim the swap
        lightning
          .waitAndClaim(result.pendingSwap)
          .then(async () => {
            // Refresh balance after claim
            if (arkWallet) {
              await fetchBalance(arkWallet);
            }
          })
          .catch((err) => {
            setError(err?.message || 'Failed to claim swap');
          });

        return result.invoice;
      } catch (err: any) {
        setError(err.message || 'Failed to create Lightning invoice');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, arkWallet, currentNetwork]
  );

  /**
   * Onboard funds from boarding address to VTXOs
   */
  const onboardFunds = useCallback(async (): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get fee info from the ark provider
      const info = await wallet.arkProvider.getInfo();

      // Use Ramps class for onboarding
      const ramps = new Ramps(wallet);
      const txid = await ramps.onboard(info.fees);

      // Refresh balance
      if (arkWallet) {
        await fetchBalance(arkWallet);
      }

      return txid;
    } catch (err: any) {
      setError(err.message || 'Failed to onboard funds');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, arkWallet]);

  /**
   * Switch network
   */
  const switchNetwork = useCallback(
    async (network: SupportedNetwork) => {
      setCurrentNetwork(network);

      // If wallet is connected, reconnect with new network
      if (wallet) {
        disconnectWallet();
        // User will need to reconnect manually
      }
    },
    [wallet, disconnectWallet]
  );

  // Context value
  const value = React.useMemo<XverseContextType>(
    () => ({
      wallet,
      walletInfo,
      balance,
      transactions,
      isConnecting,
      isLoading,
      error,
      connectWallet,
      disconnectWallet,
      getBalance,
      sendBitcoin,
      getTransactionHistory,
      payLightningInvoice,
      createLightningInvoice,
      onboardFunds,
      switchNetwork,
      currentNetwork,
    }),
    [
      wallet,
      walletInfo,
      balance,
      transactions,
      isConnecting,
      isLoading,
      error,
      connectWallet,
      disconnectWallet,
      getBalance,
      sendBitcoin,
      getTransactionHistory,
      payLightningInvoice,
      createLightningInvoice,
      onboardFunds,
      switchNetwork,
      currentNetwork,
    ]
  );

  return <XverseContext.Provider value={value}>{children}</XverseContext.Provider>;
};
