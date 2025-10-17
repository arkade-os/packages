import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Wallet, Ramps, RestArkProvider, type NetworkName } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';
import { MetaMaskSnapIdentity } from '../utils/MetaMaskSnapIdentity';

const SNAP_ID = 'local:http://localhost:8080';
const NETWORK_STORAGE_KEY = 'arkade-snap-network';

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
    arkServerUrl: 'https://bitcoin-beta-v8.arkade.sh',
    esploraUrl: 'https://mempool.space/api',
    boltzUrl: 'https://boltz-v8.arkade.sh',
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

// Default network - can be changed by user
export const DEFAULT_NETWORK: SupportedNetwork = 'bitcoin';

/**
 * Get saved network from localStorage or return default
 */
const getSavedNetwork = (): SupportedNetwork => {
  try {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (saved === 'bitcoin' || saved === 'signet') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read network from localStorage:', error);
  }
  return DEFAULT_NETWORK;
};

/**
 * Save network selection to localStorage
 */
const saveNetwork = (network: SupportedNetwork): void => {
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, network);
  } catch (error) {
    console.warn('Failed to save network to localStorage:', error);
  }
};

interface WalletInfo {
  arkAddress: string;
  boardingAddress: string;
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

type MetaMaskStatus = 'flask-ready' | 'no-metamask' | 'wrong-metamask' | 'other-wallet' | 'checking';

interface MetaMaskContextType {
  isConnected: boolean;
  walletInfo: WalletInfo | null;
  balance: Balance | null;
  transactions: Transaction[];
  loading: boolean;
  metamaskStatus: MetaMaskStatus;
  currentNetwork: SupportedNetwork;
  networkConfig: NetworkConfig;
  connectSnap: () => Promise<void>;
  sendBitcoin: (to: string, amount: number) => Promise<string>;
  getBalance: () => Promise<void>;
  getTransactionHistory: () => Promise<void>;
  payLightningInvoice: (invoice: string, maxFeeSats?: number) => Promise<any>;
  createLightningInvoice: (amount: number, description?: string) => Promise<any>;
  onboardFunds: () => Promise<string>;
  resetWallet: () => Promise<void>;
  switchNetwork: (network: SupportedNetwork) => Promise<void>;
}

const MetaMaskContext = createContext<MetaMaskContextType | null>(null);

export const MetaMaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [metamaskStatus, setMetaMaskStatus] = useState<MetaMaskStatus>('checking');
  const [currentNetwork, setCurrentNetwork] = useState<SupportedNetwork>(getSavedNetwork());

  // Get current network configuration
  const networkConfig = NETWORK_CONFIGS[currentNetwork];

  // Store wallet and lightning instances
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [lightning, setLightning] = useState<ArkadeLightning | null>(null);

  /**
   * Detect MetaMask Flask installation status
   */
  const detectMetaMaskStatus = useCallback(async (): Promise<MetaMaskStatus> => {
    // Check if any ethereum provider exists
    if (!window.ethereum) {
      return 'no-metamask';
    }

    // Check if it's MetaMask
    if (!window.ethereum.isMetaMask) {
      return 'other-wallet';
    }

    // Check if it supports snaps (Flask feature)
    try {
      // Try to call wallet_getSnaps - if it works, it's Flask
      await window.ethereum.request({
        method: 'wallet_getSnaps',
      });
      return 'flask-ready';
    } catch (error: any) {
      // If we get 403 or method not found, it's regular MetaMask (not Flask)
      if (error.code === 4200 || error.code === -32601) {
        return 'wrong-metamask';
      }
      // Other errors might mean Flask but some other issue
      console.error('Error detecting MetaMask Flask:', error);
      return 'wrong-metamask';
    }
  }, []);

  /**
   * Check if snap is already installed
   */
  const checkSnapInstalled = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) {
      return false;
    }

    try {
      const installedSnaps = await window.ethereum.request({
        method: 'wallet_getSnaps',
      });

      return Boolean(installedSnaps && installedSnaps[SNAP_ID]);
    } catch (error) {
      console.error('Failed to check snap installation:', error);
      return false;
    }
  }, []);

  /**
   * Connect to MetaMask Snap and initialize Arkade Wallet
   */
  const connectSnap = useCallback(async () => {
    try {
      setLoading(true);

      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask extension.');
      }

      // Check if snap is installed
      const isSnapInstalled = await checkSnapInstalled();

      if (!isSnapInstalled) {
        // Request snap installation
        await window.ethereum.request({
          method: 'wallet_requestSnaps',
          params: {
            [SNAP_ID]: { version: '^1.0.0' },
          },
        });
      }

      // Wait a bit for snap to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get public keys from snap
      const publicKeyResponse = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: { method: 'arkade_getPublicKey' },
        },
      });

      if (!publicKeyResponse || !publicKeyResponse.compressedPublicKey || !publicKeyResponse.xOnlyPublicKey) {
        throw new Error('Failed to get public keys from snap');
      }

      const compressedPublicKey = publicKeyResponse.compressedPublicKey;

      // Get server info to build Ark address using RestArkProvider
      const arkProvider = new RestArkProvider(networkConfig.arkServerUrl);
      const serverInfo = await arkProvider.getInfo();

      // Convert server's signer pubkey to x-only format (32 bytes = 64 hex chars)
      // Server returns compressed pubkey with 0x prefix (0x + 66 chars)
      let signerPubkey = serverInfo.signerPubkey.slice(2); // Remove 0x prefix
      if (signerPubkey.length === 66) {
        // Compressed pubkey: remove first byte (02 or 03 prefix) to get x-only
        signerPubkey = signerPubkey.slice(2);
      }

      const serverNetwork = serverInfo.network;

      // Verify network matches
      if (serverNetwork !== networkConfig.networkName) {
        console.warn(`Server network (${serverNetwork}) doesn't match expected network (${networkConfig.networkName})`);
      }

      // Get Ark address from snap with server timelock parameters
      const addressResponse = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: {
            method: 'arkade_getAddress',
            params: {
              network: networkConfig.networkName,
              signerPubkey,
              unilateralExitDelay: serverInfo.unilateralExitDelay.toString(),
            },
          },
        },
      });

      if (!addressResponse || !addressResponse.address) {
        throw new Error('Failed to get Ark address from snap');
      }

      const snapArkAddress = addressResponse.address;

      // Create MetaMaskSnapIdentity
      const identity = new MetaMaskSnapIdentity(
        compressedPublicKey,
        snapArkAddress,
        window.ethereum
      );

      // Create Arkade Wallet
      console.log(networkConfig.arkServerUrl, networkConfig.esploraUrl)
      const arkWallet = await Wallet.create({
        identity,
        arkServerUrl: networkConfig.arkServerUrl,
        esploraUrl: networkConfig.esploraUrl,
      });

      // Get boarding address from SDK
      const boardingAddress = await arkWallet.getBoardingAddress();

      // Use the snap-provided Ark address
      const arkAddress = snapArkAddress;

      // Initialize Lightning (only if network supports it)
      let arkLightning: ArkadeLightning | null = null;
      if (networkConfig.hasLightning && networkConfig.boltzUrl) {
        const swapProvider = new BoltzSwapProvider({
          apiUrl: networkConfig.boltzUrl,
          network: networkConfig.networkName as any,
        });

        arkLightning = new ArkadeLightning({
          wallet: arkWallet as any, // Type mismatch between SDK versions
          swapProvider,
        });
      }

      // Store instances
      setWallet(arkWallet);
      setLightning(arkLightning);

      // Set wallet info
      setWalletInfo({
        arkAddress,
        boardingAddress,
        network: currentNetwork,
      });

      setIsConnected(true);

      console.log('Wallet connected successfully!', {
        arkAddress,
        boardingAddress,
      });
    } catch (error: any) {
      console.error('Connection failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [checkSnapInstalled, networkConfig, currentNetwork]);

  /**
   * Detect MetaMask status on page load
   */
  useEffect(() => {
    const detectAndAutoConnect = async () => {
      try {
        const status = await detectMetaMaskStatus();
        console.log(status)
        setMetaMaskStatus(status);

        // Only attempt auto-connect if Flask is ready
        if (status === 'flask-ready' && !isConnected) {
          const isInstalled = await checkSnapInstalled();
          if (isInstalled) {
            console.log('Snap already installed, auto-connecting...');
            await connectSnap();
          }
        }
      } catch (error) {
        console.error('Detection failed:', error);
        setMetaMaskStatus('no-metamask');
      }
    };

    detectAndAutoConnect();
  }, [detectMetaMaskStatus, checkSnapInstalled, connectSnap, isConnected]);

  /**
   * Get wallet balance
   */
  const getBalance = useCallback(async () => {
    if (!wallet) return;

    try {
      const bal = await wallet.getBalance();
      const vtxos = await wallet.getVtxos();

      console.log('[MetaMaskProvider] Balance from SDK:', {
        total: Number(bal.total),
        available: Number(bal.available),
        settled: Number(bal.settled || 0n),
        preconfirmed: Number(bal.preconfirmed || 0n),
        recoverable: Number(bal.recoverable || 0n),
        boarding: Number(bal.boarding.total),
      });

      console.log('[MetaMaskProvider] VTXOs:', vtxos.map((v: any) => ({
        id: v.id,
        amount: Number(v.amount || v.value || 0),
        pending: v.pending,
        settled: v.settled,
        spent: v.spent,
      })));

      const vtxoList = vtxos.map((vtxo: any) => ({
        id: vtxo.id || vtxo.txid || `${vtxo.txid}:${vtxo.vout}`,
        amount: Number(vtxo.amount || vtxo.value || 0),
        expiry: vtxo.expiry || 0,
        status: vtxo.pending ? 'pending' : vtxo.settled ? 'settled' : 'preconfirmed',
      }));

      setBalance({
        total: Number(bal.total),
        onchain: Number(bal.boarding.total),
        offchain: Number(bal.available),
        settled: Number(bal.settled || 0n),
        preconfirmed: Number(bal.preconfirmed || 0n),
        recoverable: Number(bal.recoverable || 0n),
        vtxoList,
      });
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  }, [wallet]);

  /**
   * Get transaction history
   */
  const getTransactionHistory = useCallback(async () => {
    if (!wallet) return;

    try {
      const history = await wallet.getTransactionHistory();

      console.log('[MetaMaskProvider] Raw transaction history:', JSON.stringify(history, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2
      ));

      // Transform to our format
      const txs: Transaction[] = history.map((tx: any) => {
        const txid = tx.key?.arkTxid || tx.key?.commitmentTxid || tx.key?.boardingTxid || 'unknown';

        // Check multiple possible formats for transaction type
        let type: 'send' | 'receive' = 'receive';
        const typeStr = tx.type?.toString().toUpperCase() || '';
        if (typeStr === 'SEND' || typeStr === 'SENT' || tx.type === 1) {
          type = 'send';
        } else if (typeStr === 'RECEIVE' || typeStr === 'RECEIVED' || tx.type === 0) {
          type = 'receive';
        }

        const hasArkTxid = tx.key?.arkTxid && tx.key.arkTxid !== 'unknown';
        const hasBoardingTxid = tx.key?.boardingTxid && tx.key.boardingTxid !== 'unknown';
        const layer = hasArkTxid ? 'offchain' : hasBoardingTxid ? 'onchain' : 'offchain';
        const amount = typeof tx.amount === 'bigint' ? Number(tx.amount) : Number(tx.amount || 0);
        const timestamp = typeof tx.createdAt === 'bigint' ? Number(tx.createdAt) : tx.createdAt || Date.now();
        const status = tx.settled ? 'settled' : 'preconfirmed';

        console.log('[MetaMaskProvider] Processing tx:', {
          rawType: tx.type,
          determinedType: type,
          txid,
          amount,
          layer,
        });

        return {
          txid,
          amount,
          type,
          timestamp,
          layer,
          status,
        };
      });

      console.log('[MetaMaskProvider] Processed transactions:', txs);
      setTransactions(txs);
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      setTransactions([]);
    }
  }, [wallet]);

  /**
   * Send Bitcoin
   */
  const sendBitcoin = useCallback(
    async (to: string, amount: number): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      try {
        setLoading(true);
        const txId = await wallet.sendBitcoin({
          address: to,
          amount: amount,
        });

        // Refresh balance and history
        await getBalance();
        await getTransactionHistory();

        return txId;
      } catch (error: any) {
        console.error('Send failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [wallet, getBalance, getTransactionHistory]
  );

  /**
   * Pay Lightning invoice
   */
  const payLightningInvoice = useCallback(
    async (invoice: string, maxFeeSats?: number) => {
      if (!lightning) {
        throw new Error('Lightning not initialized');
      }

      try {
        setLoading(true);
        const result = await lightning.sendLightningPayment({ invoice });

        // Refresh balance and history
        await getBalance();
        await getTransactionHistory();

        return result;
      } catch (error: any) {
        console.error('Lightning payment failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [lightning, getBalance, getTransactionHistory]
  );

  /**
   * Create Lightning invoice
   */
  const createLightningInvoice = useCallback(
    async (amount: number, description?: string) => {
      if (!lightning) {
        throw new Error('Lightning not initialized');
      }

      try {
        setLoading(true);
        const result = await lightning.createLightningInvoice({
          amount,
          description: description || 'Arkade wallet payment',
        });

        // Start monitoring for payment
        lightning.waitAndClaim(result.pendingSwap).then(() => {
          console.log('Lightning payment received and claimed');
          getBalance();
          getTransactionHistory();
        }).catch((error: unknown) => {
          console.error('Failed to claim Lightning payment:', error);
        });

        return result;
      } catch (error: any) {
        console.error('Failed to create Lightning invoice:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [lightning, getBalance, getTransactionHistory]
  );

  /**
   * Onboard funds from boarding address to VTXOs
   */
  const onboardFunds = useCallback(async (): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      const ramps = new Ramps(wallet);
      const txid = await ramps.onboard();

      // Refresh balance and history
      await getBalance();
      await getTransactionHistory();

      return txid;
    } catch (error: any) {
      console.error('Onboarding failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [wallet, getBalance, getTransactionHistory]);

  /**
   * Reset wallet (for testing purposes)
   */
  const resetWallet = useCallback(async () => {
    setWallet(null);
    setLightning(null);
    setWalletInfo(null);
    setBalance(null);
    setTransactions([]);
    setIsConnected(false);
  }, []);

  /**
   * Switch network and reconnect wallet
   */
  const switchNetwork = useCallback(async (newNetwork: SupportedNetwork) => {
    if (newNetwork === currentNetwork) {
      return; // Already on this network
    }

    try {
      setLoading(true);

      // Reset wallet state
      setWallet(null);
      setLightning(null);
      setWalletInfo(null);
      setBalance(null);
      setTransactions([]);
      setIsConnected(false);

      // Update network and persist to localStorage
      setCurrentNetwork(newNetwork);
      saveNetwork(newNetwork);

      // Wait a bit for state to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reconnect with new network
      await connectSnap();

      console.log(`Switched to ${newNetwork} network successfully`);
    } catch (error: any) {
      console.error('Network switch failed:', error);
      // Revert to previous network on error
      setCurrentNetwork(currentNetwork);
      saveNetwork(currentNetwork);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentNetwork, connectSnap]);

  return (
    <MetaMaskContext.Provider
      value={{
        isConnected,
        walletInfo,
        balance,
        transactions,
        loading,
        metamaskStatus,
        currentNetwork,
        networkConfig,
        connectSnap,
        sendBitcoin,
        getBalance,
        getTransactionHistory,
        payLightningInvoice,
        createLightningInvoice,
        onboardFunds,
        resetWallet,
        switchNetwork,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = (): MetaMaskContextType => {
  const context = useContext(MetaMaskContext);
  if (!context) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
};
