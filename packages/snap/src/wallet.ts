import { SingleKey, Wallet } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider, Network } from '@arkade-os/boltz-swap';

/**
 * Derive a deterministic private key from MetaMask's entropy.
 * This ensures the same wallet address is always generated for the same MetaMask account.
 */
async function derivePrivateKey(): Promise<string> {
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  // Remove 0x prefix and take first 32 bytes (64 hex chars) for the private key
  return entropy.slice(2, 66);
}

/**
 * State keys for storing wallet data
 */
const STATE_KEYS = {
  WALLET_KEY: 'walletKey',
  WALLET_DATA: 'walletData',
  NETWORK: 'network',
};

/**
 * Arkade network configuration
 */
const ARKADE_CONFIG: Record<Network, {esploraUrl: string, arkUrl: string, boltzUrl?: string}> = {
  testnet: {
    esploraUrl: 'https://blockstream.info/api/testnet',
    arkUrl: 'https://testnet.arkade.sh',
  },
  mutinynet: {
    esploraUrl: 'https://mutinynet.com/api',
    arkUrl: 'https://mutinynet.arkade.sh',
    boltzUrl: 'https://api.boltz.mutinynet.arkade.sh',
  },
  bitcoin: {
    esploraUrl: 'https://blockstream.info/api',
    arkUrl: 'https://bitcoin-beta-v8.arkade.sh',
    boltzUrl: 'https://boltz-v8.arkade.sh',
  },
  regtest: {
    esploraUrl: 'http://localhost:3000',
    arkUrl: 'http://localhost:7070'
  }
};

export interface WalletInfo {
  arkAddress: string;
  boardingAddress: string;
  network: string;
}

export interface UTXO {
  txid: string;
  vout: number;
  amount: number;
  address: string;
}

export interface VTXO {
  id: string;
  amount: number;
  expiry: number;
  status: 'settled' | 'preconfirmed' | 'pending';
}

export interface Balance {
  total: number;
  onchain: number;
  offchain: number;
  vtxos: number;
  settled: number;
  preconfirmed: number;
  utxos: UTXO[];
  vtxoList: VTXO[];
}

export interface Transaction {
  txid: string;
  amount: number;
  type: 'send' | 'receive';
  timestamp: number;
  confirmations: number;
  asset: string;
  layer: 'onchain' | 'offchain'; // UTXO or VTXO
  status?: 'pending' | 'preconfirmed' | 'settled'; // VTXO status for offchain transactions
}

/**
 * Get stored wallet private key
 */
async function getStoredKey(): Promise<string | null> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  return state?.[STATE_KEYS.WALLET_KEY] as string || null;
}

/**
 * Store wallet private key
 */
async function storeKey(key: string): Promise<void> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: {
        ...state,
        [STATE_KEYS.WALLET_KEY]: key,
      },
    },
  });
}

/**
 * Get stored wallet data
 */
async function getStoredWalletData(): Promise<any> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  return state?.[STATE_KEYS.WALLET_DATA] || null;
}

/**
 * Store wallet data
 */
async function storeWalletData(data: any): Promise<void> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: {
        ...state,
        [STATE_KEYS.WALLET_DATA]: data,
      },
    },
  });
}

/**
 * Get network configuration
 */
async function getNetwork(): Promise<Network> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  return (state?.[STATE_KEYS.NETWORK] as Network) || 'bitcoin';
}

/**
 * Store network configuration
 */
async function storeNetwork(network: Network): Promise<void> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: {
        ...state,
        [STATE_KEYS.NETWORK]: network,
      },
    },
  });
}

/**
 * Initialize Arkade wallet from stored key
 */
async function initWallet(): Promise<Wallet | null> {
  const key = await getStoredKey();
  if (!key) {
    return null;
  }

  const network = await getNetwork();
  const config = ARKADE_CONFIG[network];

  const signer = SingleKey.fromHex(key);
  const wallet = await Wallet.create({
    identity: signer,
    esploraUrl: config.esploraUrl,
    arkServerUrl: config.arkUrl,
  });

  return wallet;
}

/**
 * Reset/clear wallet data (clears all stored state)
 */
export async function resetWallet(): Promise<void> {
  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: {},
    },
  });
}

/**
 * Create a new Arkade wallet
 */
export async function createWallet(network: Network): Promise<WalletInfo> {
  // Check if wallet already exists
  const existingKey = await getStoredKey();
  if (existingKey) {
    throw new Error('Wallet already exists. Please use the existing wallet or reset it first.');
  }

  // Derive deterministic key from MetaMask's entropy
  // This ensures the same wallet address for the same MetaMask account
  const privateKeyHex = await derivePrivateKey();
  const signer = SingleKey.fromHex(privateKeyHex);

  // Store the key
  await storeKey(privateKeyHex);
  await storeNetwork(network);

  // Initialize wallet
  const config = ARKADE_CONFIG[network];
  const wallet = await Wallet.create({
    identity: signer,
    esploraUrl: config.esploraUrl,
    arkServerUrl: config.arkUrl,
  });

  // Get addresses
  const arkAddress = await wallet.getAddress();
  const boardingAddress = await wallet.getBoardingAddress();

  // Store wallet data
  await storeWalletData({
    arkAddress,
    boardingAddress,
    createdAt: Date.now(),
  });

  return {
    arkAddress,
    boardingAddress,
    network,
  };
}

/**
 * Get wallet information
 */
export async function getWalletInfo(): Promise<WalletInfo | null> {
  const walletData = await getStoredWalletData();
  if (!walletData) {
    return null;
  }

  const network = await getNetwork();

  return {
    arkAddress: walletData.arkAddress,
    boardingAddress: walletData.boardingAddress,
    network,
  };
}

/**
 * Get wallet balance
 */
export async function getBalance(): Promise<Balance> {
  const wallet = await initWallet();
  if (!wallet) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  const balance = await wallet.getBalance();

  // Get VTXOs with details
  const vtxos = await wallet.getVtxos();
  const vtxoList: VTXO[] = vtxos.map((vtxo: any) => ({
    id: vtxo.id || vtxo.txid,
    amount: Number(vtxo.amount || vtxo.value || 0),
    expiry: vtxo.expiry || 0,
    status: vtxo.pending ? 'pending' : (vtxo.settled ? 'settled' : 'preconfirmed'),
  }));

  // Get on-chain UTXOs - currently the SDK doesn't expose individual UTXOs
  // We'll use an empty array for now, can be enhanced later when SDK provides this
  const utxos: UTXO[] = [];

  return {
    total: Number(balance.total),
    onchain: Number(balance.boarding.total),
    offchain: Number(balance.available),
    vtxos: Number(balance.available),
    settled: Number(balance.settled || 0n),
    preconfirmed: Number(balance.preconfirmed || 0n),
    utxos,
    vtxoList,
  };
}

/**
 * Send Bitcoin via Ark protocol
 */
export async function sendBitcoin(to: string, amount: number): Promise<string> {
  const wallet = await initWallet();
  if (!wallet) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  // Send transaction via Ark
  const txId = await wallet.sendBitcoin({
    address: to,
    amount: amount,
  });

  return txId;
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(): Promise<Transaction[]> {
  const wallet = await initWallet();
  if (!wallet) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  try {
    // Get transaction history from Arkade
    const history = await wallet.getTransactionHistory();

    // Get current VTXOs to determine their status (preconfirmed vs settled)
    const vtxos = await wallet.getVtxos();
    const vtxoStatusMap = new Map<string, 'pending' | 'preconfirmed' | 'settled'>();

    vtxos.forEach((vtxo: any) => {
      const id = vtxo.id || vtxo.txid || `${vtxo.txid}:${vtxo.vout}`;
      const status = vtxo.pending ? 'pending' : (vtxo.virtualStatus?.state === 'settled' ? 'settled' : 'preconfirmed');
      vtxoStatusMap.set(id, status);
    });

    // Debug: Log raw transactions from SDK
    console.log('=== SDK TRANSACTION HISTORY ===');
    console.log(`Total transactions from SDK: ${history.length}`);
    history.forEach((tx: any, index: number) => {
      // Convert BigInt for logging
      const txLog = {
        index,
        type: tx.type,
        amount: typeof tx.amount === 'bigint' ? tx.amount.toString() : tx.amount,
        settled: tx.settled,
        createdAt: tx.createdAt,
        arkTxid: tx.key?.arkTxid || 'none',
        commitmentTxid: tx.key?.commitmentTxid || 'none',
        boardingTxid: tx.key?.boardingTxid || 'none',
      };
      console.log(JSON.stringify(txLog));
    });
    console.log('=== END ===');

    // Filter out small change outputs (less than 1000 sats that are RECEIVED)
    // Lightning payments create change that shows as RECEIVED but shouldn't be displayed
    const filteredHistory = history.filter((tx: any) => {
      const txType = tx.type;
      const amount = typeof tx.amount === 'bigint' ? Number(tx.amount) : tx.amount;

      // Keep all SEND transactions
      if (txType === 'SEND' || txType === 'TxSent' || txType === 0) {
        return true;
      }

      // For RECEIVED transactions, filter out very small amounts that are likely change
      // This is a simple heuristic: amounts less than the dust limit (546 sats) or
      // amounts that are close to other receives (indicating change from a spend)

      // Keep the first receive (original deposit)
      const receiveIndex = history.filter((t: any) =>
        t.type === 'RECEIVED' || t.type === 'TxReceived' || t.type === 1
      ).indexOf(tx);

      if (receiveIndex === 0) {
        return true; // Keep first receive (original boarding)
      }

      // Filter out receives that are less than the previous receive (likely change)
      const previousReceives = history.filter((t: any) => {
        const tType = t.type;
        const isPrevious = history.indexOf(t) < history.indexOf(tx);
        const isReceive = tType === 'RECEIVED' || tType === 'TxReceived' || tType === 1;
        return isReceive && isPrevious;
      });

      if (previousReceives.length > 0) {
        const prevAmount = typeof previousReceives[previousReceives.length - 1].amount === 'bigint'
          ? Number(previousReceives[previousReceives.length - 1].amount)
          : previousReceives[previousReceives.length - 1].amount;

        // If this receive is smaller than the previous one, it's likely change
        if (amount < prevAmount) {
          console.log(`Filtering out change: ${amount} sats (previous was ${prevAmount} sats)`);
          return false;
        }
      }

      return true;
    });

    console.log(`Filtered to ${filteredHistory.length} transactions (removed ${history.length - filteredHistory.length} change outputs)`);

    // Transform ArkTransaction to JSON-serializable Transaction
    // ArkTransaction has complex nested objects that aren't serializable by MetaMask RPC
    return filteredHistory.map((tx: any) => {

      // Extract the main transaction ID from the key object
      let txid = 'unknown';
      if (tx.key) {
        txid = tx.key.arkTxid || tx.key.commitmentTxid || tx.key.boardingTxid || 'unknown';
      }

      // Determine transaction type (send/receive) from TxType enum
      const type = tx.type === 'SEND' || tx.type === 1 ? 'send' : 'receive';

      // Determine layer based on which txid is the primary one:
      // - If boardingTxid is set and is the same as the main txid, it's a boarding transaction
      // - Otherwise, it's an off-chain VTXO transaction (arkTxid/commitmentTxid)
      const hasBoardingTxid = tx.key?.boardingTxid && tx.key.boardingTxid !== 'unknown' && tx.key.boardingTxid !== '';
      const hasArkTxid = tx.key?.arkTxid && tx.key.arkTxid !== 'unknown' && tx.key.arkTxid !== '';

      // If it has an arkTxid, it's a VTXO (offchain). Otherwise, if it only has boardingTxid, it's boarding (onchain)
      const layer = hasArkTxid ? 'offchain' : (hasBoardingTxid ? 'onchain' : 'offchain');

      // Safely convert BigInt values to numbers
      const amount = typeof tx.amount === 'bigint' ? Number(tx.amount) : Number(tx.amount || 0);
      const timestamp = typeof tx.createdAt === 'bigint' ? Number(tx.createdAt) : (tx.createdAt || Date.now());

      // Determine VTXO status for offchain transactions
      let status: 'pending' | 'preconfirmed' | 'settled' | undefined;
      if (layer === 'offchain') {
        // Try to find matching VTXO status
        // The txid might match arkTxid or commitmentTxid
        status = vtxoStatusMap.get(txid);

        // If we can't find it in the VTXO map, fall back to settled flag
        if (!status) {
          status = tx.settled ? 'settled' : 'preconfirmed';
        }
      }

      const confirmations = tx.settled ? 1 : 0;

      return {
        txid: String(txid),
        amount,
        type,
        timestamp,
        confirmations,
        asset: 'btc',
        layer,
        status,
      };
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    // Return empty array instead of throwing to prevent snap crashes
    return [];
  }
}

/**
 * Get VTXOs (Virtual Transaction Outputs)
 */
export async function getVTXOs(): Promise<any[]> {
  const wallet = await initWallet();
  if (!wallet) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  const vtxos = await wallet.getVtxos();
  return vtxos;
}

/**
 * Initialize Lightning swap provider
 */
async function initLightning(): Promise<ArkadeLightning | null> {
  const wallet = await initWallet();
  if (!wallet) {
    return null;
  }

  const network = await getNetwork();
  const config = ARKADE_CONFIG[network];

  const swapProvider = new BoltzSwapProvider({
    apiUrl: config.boltzUrl,
    network: network as Network
  });

  // Type assertion to handle SDK version mismatch between boltz-swap (uses SDK 0.2.3) and main SDK (0.3.1-alpha.3)
  const arkadeLightning = new ArkadeLightning({
    wallet: wallet,
    swapProvider,
  });

  return arkadeLightning;
}

/**
 * Pay Lightning invoice using Ark VTXOs via submarine swap
 */
export async function payLightningInvoice(invoice: string, maxFeeSats?: number): Promise<{ txid: string; preimage: string; amount: number }> {
  const arkadeLightning = await initLightning();
  if (!arkadeLightning) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  // Send Lightning payment via Boltz submarine swap
  const result = await arkadeLightning.sendLightningPayment({ invoice });

  return {
    txid: result.txid,
    preimage: result.preimage,
    amount: result.amount,
  };
}

/**
 * Create Lightning invoice to receive funds into Arkade wallet
 */
export async function createLightningInvoice(amount: number, description?: string): Promise<{ invoice: string; paymentHash: string; amount: number; expiry: number }> {
  const arkadeLightning = await initLightning();
  if (!arkadeLightning) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  // Create Lightning invoice via Boltz reverse swap
  const result = await arkadeLightning.createLightningInvoice({
    amount,
    description: description || 'Arkade wallet payment',
  });

  // Wait for the invoice to be paid and automatically claim it
  // This runs in the background
  arkadeLightning.waitAndClaim(result.pendingSwap).catch((error) => {
    console.error('Error claiming Lightning payment:', error);
  });

  return {
    invoice: result.invoice,
    paymentHash: result.paymentHash,
    amount: result.amount,
    expiry: result.expiry,
  };
}

/**
 * Start monitoring for incoming funds (VTXOs and UTXOs)
 * Returns a function to stop monitoring
 */
export async function startIncomingFundsMonitoring(): Promise<() => void> {
  const wallet = await initWallet();
  if (!wallet) {
    throw new Error('No wallet found. Please create a wallet first.');
  }

  console.log('Starting incoming funds monitoring...');

  // Subscribe to incoming funds notifications
  const stopFn = await wallet.notifyIncomingFunds((notification: any) => {
    console.log('Incoming funds notification:', notification.type);

    try {
      if (notification.type === 'vtxo') {
        // New VTXOs received (off-chain transactions)
        const newVtxos = notification.newVtxos || [];
        const spentVtxos = notification.spentVtxos || [];

        console.log(`Received ${newVtxos.length} new VTXOs, ${spentVtxos.length} spent`);

        for (const vtxo of newVtxos) {
          const amount = Number(vtxo.value || 0);
          console.log(`New VTXO: ${amount} sats`);
        }
      } else if (notification.type === 'utxo') {
        // New UTXOs received (on-chain boarding transactions)
        const coins = notification.coins || [];

        console.log(`Received ${coins.length} new boarding UTXOs`);

        for (const coin of coins) {
          const amount = Number(coin.value || 0);
          console.log(`New boarding UTXO: ${amount} sats`);
        }
      }
    } catch (error) {
      console.error('Error processing incoming funds notification:', error);
    }
  });

  console.log('Incoming funds monitoring started');

  return stopFn;
}
