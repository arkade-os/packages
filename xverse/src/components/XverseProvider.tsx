/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Wallet, RestArkProvider, type NetworkName } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';
import { XverseIdentity } from '../utils/XverseIdentity';
import { request, type GetAddressResponse, type AddressPurpose } from 'sats-connect';

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
      const getAddressOptions = {
        payload: {
          purposes: ['payment', 'ordinals'] as AddressPurpose[],
          message: 'Connect to Arkade Bitcoin Layer 2 Wallet',
          network: {
            type: currentNetwork === 'bitcoin' ? 'Mainnet' : 'Testnet',
          },
        },
        onFinish: async (response: GetAddressResponse) => {
          try {
            console.log('Xverse wallet connected:', response);

            const paymentAddress = response.addresses.find(
              (addr) => addr.purpose === 'payment'
            );
            const ordinalsAddress = response.addresses.find(
              (addr) => addr.purpose === 'ordinals'
            );

            if (!paymentAddress) {
              throw new Error('No payment address found in Xverse wallet');
            }

            console.log('Payment address:', paymentAddress.address);
            console.log('Public key:', paymentAddress.publicKey);

            // Get network config
            const networkConfig = NETWORK_CONFIGS[currentNetwork];

            // Create Ark provider
            const arkProvider = new RestArkProvider(
              networkConfig.arkServerUrl,
              networkConfig.esploraUrl
            );

            // Get server info for Ark address generation
            const info = await arkProvider.getInfo();
            console.log('Ark server info:', info);

            // Create XverseIdentity instance
            const identity = new XverseIdentity(
              paymentAddress.publicKey,
              paymentAddress.address, // Use payment address as default
              paymentAddress.address,
              ordinalsAddress?.address
            );

            console.log('Creating Arkade wallet with Xverse identity...');

            // Create Arkade Wallet instance with XverseIdentity
            const arkadeWallet = new Wallet(
              identity,
              arkProvider,
              networkConfig.networkName
            );

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
          } catch (err: any) {
            console.error('Error setting up wallet:', err);
            setError(err.message || 'Failed to create Arkade wallet');
          } finally {
            setIsConnecting(false);
          }
        },
        onCancel: () => {
          console.log('User cancelled wallet connection');
          setError('User cancelled wallet connection');
          setIsConnecting(false);
        },
      };

      await request('getAccounts', getAddressOptions.payload);
      getAddressOptions.onFinish(await request('getAccounts', getAddressOptions.payload) as any);
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
    const vtxos = await walletInstance.getVtxos();
    const boardingBalance = await walletInstance.getBoardingBalance();

    // Calculate balance from VTXOs
    let offchainBalance = 0;
    let settledBalance = 0;
    let preconfirmedBalance = 0;
    let recoverableBalance = 0;

    const vtxoList = vtxos.map((vtxo) => {
      const amount = Number(vtxo.amount);
      offchainBalance += amount;

      if (vtxo.swept) {
        recoverableBalance += amount;
      } else if (vtxo.redeemed) {
        settledBalance += amount;
      } else {
        preconfirmedBalance += amount;
      }

      return {
        id: vtxo.id,
        amount,
        expiry: vtxo.expiry.median,
        status: vtxo.swept ? 'swept' : vtxo.redeemed ? 'settled' : 'pending',
      };
    });

    const onchainBalance = Number(boardingBalance);
    const totalBalance = onchainBalance + offchainBalance;

    const balanceData: Balance = {
      total: totalBalance,
      onchain: onchainBalance,
      offchain: offchainBalance,
      settled: settledBalance,
      preconfirmed: preconfirmedBalance,
      recoverable: recoverableBalance,
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

        // Create and send transaction
        const txid = await wallet.send(toAddress, BigInt(amount));

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
      const vtxos = await wallet.getVtxos();

      // Convert VTXOs to transactions
      const txList: Transaction[] = vtxos.map((vtxo) => ({
        txid: vtxo.id,
        amount: Number(vtxo.amount),
        type: 'receive' as const,
        timestamp: Date.now(), // TODO: Get actual timestamp
        layer: 'offchain' as const,
        status: vtxo.swept ? 'swept' : vtxo.redeemed ? 'settled' : 'pending',
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

        // Create Lightning instance
        const boltzProvider = new BoltzSwapProvider(networkConfig.boltzUrl);
        const lightning = new ArkadeLightning(wallet, boltzProvider);

        // Pay invoice (submarine swap: VTXO -> Lightning)
        const preimage = await lightning.payInvoice(invoice);

        console.log('Invoice paid, preimage:', preimage);

        // Refresh balance
        await fetchBalance(wallet);

        return preimage;
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

        // Create Lightning instance
        const boltzProvider = new BoltzSwapProvider(networkConfig.boltzUrl);
        const lightning = new ArkadeLightning(wallet, boltzProvider);

        // Create invoice (reverse swap: Lightning -> VTXO)
        const invoice = await lightning.createInvoice(BigInt(amount), description);

        console.log('Invoice created:', invoice);

        // Start background process to claim the swap
        lightning
          .waitAndClaim(invoice)
          .then(async (txid) => {
            console.log('Swap claimed:', txid);
            // Refresh balance after claim
            await fetchBalance(wallet);
          })
          .catch((err) => {
            console.error('Failed to claim swap:', err);
          });

        return invoice;
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

      const txid = await wallet.onboard();

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
