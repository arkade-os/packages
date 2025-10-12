import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Wallet } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';
import { MetaMaskSnapIdentity } from '../utils/MetaMaskSnapIdentity';

const SNAP_ID = 'local:http://localhost:8080';

// Network configuration
const ARK_SERVER_URL = 'https://signet.arkade.sh';
const ESPLORA_URL = 'https://mempool.space/signet/api';
const BOLTZ_URL = 'https://api.boltz.exchange';

interface WalletInfo {
  arkAddress: string;
  boardingAddress: string;
  taprootAddress: string;
  network: string;
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

interface MetaMaskContextType {
  isConnected: boolean;
  walletInfo: WalletInfo | null;
  balance: Balance | null;
  transactions: Transaction[];
  loading: boolean;
  connectSnap: () => Promise<void>;
  sendBitcoin: (to: string, amount: number) => Promise<string>;
  getBalance: () => Promise<void>;
  getTransactionHistory: () => Promise<void>;
  payLightningInvoice: (invoice: string, maxFeeSats?: number) => Promise<any>;
  createLightningInvoice: (amount: number, description?: string) => Promise<any>;
  resetWallet: () => Promise<void>;
}

const MetaMaskContext = createContext<MetaMaskContextType | null>(null);

export const MetaMaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Store wallet and lightning instances
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [lightning, setLightning] = useState<ArkadeLightning | null>(null);

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
      const installedSnaps = await window.ethereum.request({
        method: 'wallet_getSnaps',
      });

      const isSnapInstalled = installedSnaps && installedSnaps[SNAP_ID];

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

      // Get accounts from snap
      const accountResponse = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: SNAP_ID,
          request: { method: 'bitcoin_getAccounts' },
        },
      });

      if (!accountResponse || !accountResponse.accounts || accountResponse.accounts.length === 0) {
        throw new Error('No accounts found in snap');
      }

      const account = accountResponse.accounts[0];
      const taprootAddress = account.address;
      const publicKey = account.publicKey;

      // Create MetaMaskSnapIdentity
      const identity = new MetaMaskSnapIdentity(
        publicKey,
        taprootAddress,
        window.ethereum
      );

      // Create Arkade Wallet
      const arkWallet = await Wallet.create({
        identity,
        arkServerUrl: ARK_SERVER_URL,
        esploraUrl: ESPLORA_URL,
      });

      // Get Ark addresses
      const arkAddress = await arkWallet.getAddress();
      const boardingAddress = await arkWallet.getBoardingAddress();

      // Initialize Lightning
      const swapProvider = new BoltzSwapProvider({
        apiUrl: BOLTZ_URL,
        network: 'signet' as any,
      });

      const arkLightning = new ArkadeLightning({
        wallet: arkWallet as any, // Type mismatch between SDK versions
        swapProvider,
      });

      // Store instances
      setWallet(arkWallet);
      setLightning(arkLightning);

      // Set wallet info
      setWalletInfo({
        arkAddress,
        boardingAddress,
        taprootAddress,
        network: 'signet',
      });

      setIsConnected(true);

      console.log('Wallet connected successfully!', {
        arkAddress,
        boardingAddress,
        taprootAddress,
      });
    } catch (error: any) {
      console.error('Connection failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get wallet balance
   */
  const getBalance = useCallback(async () => {
    if (!wallet) return;

    try {
      const bal = await wallet.getBalance();
      const vtxos = await wallet.getVtxos();

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

      // Transform to our format
      const txs: Transaction[] = history.map((tx: any) => {
        const txid = tx.key?.arkTxid || tx.key?.commitmentTxid || tx.key?.boardingTxid || 'unknown';
        const type = tx.type === 'SEND' || tx.type === 1 ? 'send' : 'receive';
        const hasArkTxid = tx.key?.arkTxid && tx.key.arkTxid !== 'unknown';
        const hasBoardingTxid = tx.key?.boardingTxid && tx.key.boardingTxid !== 'unknown';
        const layer = hasArkTxid ? 'offchain' : hasBoardingTxid ? 'onchain' : 'offchain';
        const amount = typeof tx.amount === 'bigint' ? Number(tx.amount) : Number(tx.amount || 0);
        const timestamp = typeof tx.createdAt === 'bigint' ? Number(tx.createdAt) : tx.createdAt || Date.now();
        const status = tx.settled ? 'settled' : 'preconfirmed';

        return {
          txid,
          amount,
          type,
          timestamp,
          layer,
          status,
        };
      });

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
        const result = await lightning.sendLightningPayment({ invoice, maxFeeSats });

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
        }).catch((error) => {
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

  return (
    <MetaMaskContext.Provider
      value={{
        isConnected,
        walletInfo,
        balance,
        transactions,
        loading,
        connectSnap,
        sendBitcoin,
        getBalance,
        getTransactionHistory,
        payLightningInvoice,
        createLightningInvoice,
        resetWallet,
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
