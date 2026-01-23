/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Wallet, Ramps, type NetworkName } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';
import { XverseIdentity } from '../utils/XverseIdentity';
import { request, type AddressPurpose } from 'sats-connect';

// Network configuration type
export type SupportedNetwork = 'bitcoin' | 'signet';

// Network configurations
export interface NetworkConfig {
  networkName: NetworkName;
  arkServerUrl: string;
  esploraUrl: string;
  boltzUrl?: string;
  hasLightning: boolean;
}

export const NETWORK_CONFIGS: Record<SupportedNetwork, NetworkConfig> = {
  bitcoin: {
    arkServerUrl: 'https://arkade.computer',
    esploraUrl: 'https://mempool.space/api',
    boltzUrl: 'https://api.ark.boltz.exchange',
    networkName: 'bitcoin',
    hasLightning: true,
  },
  signet: {
    arkServerUrl: 'https://signet.arkade.sh',
    esploraUrl: 'https://mempool.space/signet/api',
    boltzUrl: undefined, // No Boltz support for Signet
    networkName: 'signet',
    hasLightning: false,
  },
};

// Default network
export const DEFAULT_NETWORK: SupportedNetwork = 'bitcoin';

interface WalletInfo {
  arkAddress: string;
  boardingAddress: string;
  paymentAddress: string;
  ordinalsAddress?: string;
  network: SupportedNetwork;
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
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  getBalance: () => Promise<void>;
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
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('Connecting to Xverse wallet...');

      // Request wallet connection from Xverse
      const response = await request('getAccounts', {
        purposes: ['payment', 'ordinals'] as AddressPurpose[],
        message: 'Connect to Arkade Bitcoin Layer 2 Wallet',
      });

      console.log('Xverse wallet connected:', response);

      if (response.status === 'error') {
        throw new Error(response.error?.message || 'Failed to connect to Xverse wallet');
      }

      // The response has a 'result' array, not 'addresses'
      const addresses = response.result;

      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses returned from Xverse wallet');
      }

      const paymentAddress = addresses.find(
        (addr: any) => addr.purpose === 'payment'
      );
      const ordinalsAddress = addresses.find(
        (addr: any) => addr.purpose === 'ordinals'
      );

      if (!paymentAddress) {
        throw new Error('No payment address found in Xverse wallet');
      }

      console.log('Payment address:', paymentAddress.address);
      console.log('Public key:', paymentAddress.publicKey);

      // Get network config
      const networkConfig = NETWORK_CONFIGS[currentNetwork];

      // Create XverseIdentity instance
      const identity = new XverseIdentity(
        paymentAddress.publicKey,
        paymentAddress.address, // Use payment address as default
        paymentAddress.address,
        ordinalsAddress?.address
      );

      console.log('Creating Arkade wallet with Xverse identity...');

      // Create Arkade Wallet instance with XverseIdentity
      const arkadeWallet = await Wallet.create({
        identity,
        arkServerUrl: networkConfig.arkServerUrl,
        esploraUrl: networkConfig.esploraUrl,
      });

      // Get Ark address
      const arkAddress = await arkadeWallet.getAddress();
      const boardingAddress = await arkadeWallet.getBoardingAddress();

      console.log('Arkade wallet created:', {
        arkAddress,
        boardingAddress,
      });

      // Set wallet state
      setWallet(arkadeWallet);
      setWalletInfo({
        arkAddress,
        boardingAddress,
        paymentAddress: paymentAddress.address,
        ordinalsAddress: ordinalsAddress?.address,
        network: currentNetwork,
      });

      // Auto-fetch balance
      await fetchBalance(arkadeWallet);

      setIsConnecting(false);
    } catch (err: any) {
      console.error('Failed to connect Xverse wallet:', err);
      setError(err.message || 'Failed to connect to Xverse wallet');
      setIsConnecting(false);
    }
  }, [currentNetwork]);

  /**
   * Disconnect wallet and clear state
   */
  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setWalletInfo(null);
    setBalance(null);
    setTransactions([]);
    setError(null);
  }, []);

  /**
   * Helper function to fetch balance
   */
  const fetchBalance = async (walletInstance: Wallet): Promise<Balance> => {
    // Use the SDK's getBalance() method
    const bal = await walletInstance.getBalance();
    const vtxos = await walletInstance.getVtxos();
    const boardingUtxos = await walletInstance.getBoardingUtxos();

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
  const getBalance = useCallback(async () => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      await fetchBalance(wallet);
    } catch (err: any) {
      console.error('Failed to fetch balance:', err);
      setError(err.message || 'Failed to fetch balance');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  /**
   * Send Bitcoin
   */
  const sendBitcoin = useCallback(
    async (toAddress: string, amount: number): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Sending Bitcoin:', { toAddress, amount });

        // Create and send transaction using the correct API
        const txid = await wallet.sendBitcoin({
          address: toAddress,
          amount: amount,
        });

        console.log('Transaction sent:', txid);

        // Refresh balance
        await fetchBalance(wallet);

        return txid;
      } catch (err: any) {
        console.error('Failed to send Bitcoin:', err);
        setError(err.message || 'Failed to send Bitcoin');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet]
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
      console.error('Failed to fetch transaction history:', err);
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
        console.log('Paying Lightning invoice:', invoice);

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

        console.log('Invoice paid:', result);

        // Refresh balance
        await fetchBalance(wallet);

        return result.preimage || '';
      } catch (err: any) {
        console.error('Failed to pay Lightning invoice:', err);
        setError(err.message || 'Failed to pay Lightning invoice');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, currentNetwork]
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
        console.log('Creating Lightning invoice:', { amount, description });

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

        console.log('Invoice created:', result);

        // Start background process to claim the swap
        lightning
          .waitAndClaim(result.pendingSwap)
          .then(async () => {
            console.log('Lightning payment received and claimed');
            // Refresh balance after claim
            await fetchBalance(wallet);
          })
          .catch((err) => {
            console.error('Failed to claim swap:', err);
          });

        return result.invoice;
      } catch (err: any) {
        console.error('Failed to create Lightning invoice:', err);
        setError(err.message || 'Failed to create Lightning invoice');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, currentNetwork]
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
      console.log('Onboarding funds...');

      // Get fee info from the ark provider
      const info = await wallet.arkProvider.getInfo();

      // Use Ramps class for onboarding
      const ramps = new Ramps(wallet);
      const txid = await ramps.onboard(info.fees);

      console.log('Funds onboarded:', txid);

      // Refresh balance
      await fetchBalance(wallet);

      return txid;
    } catch (err: any) {
      console.error('Failed to onboard funds:', err);
      setError(err.message || 'Failed to onboard funds');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

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
  const value: XverseContextType = {
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
  };

  return <XverseContext.Provider value={value}>{children}</XverseContext.Provider>;
};
