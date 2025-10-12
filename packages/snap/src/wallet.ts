import { IWallet, SingleKey, Wallet } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider, Network } from '@arkade-os/boltz-swap';

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
async function initWallet(): Promise<IWallet | null> {
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

  // Generate new key
  const signer = SingleKey.fromRandomBytes();
  const privateKeyHex = signer.toHex();

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

  // Get transaction history from Arkade
  const history = await wallet.getTransactionHistory();

  return history.map((tx: any) => ({
    txid: tx.txid,
    amount: tx.amount,
    type: tx.type,
    timestamp: tx.timestamp,
    confirmations: tx.confirmations || 0,
    asset: tx.asset || 'btc',
    // Determine if transaction is onchain or offchain based on confirmations
    // VTXOs (offchain) typically have 0 confirmations and settle instantly
    // On-chain transactions have confirmations > 0 or are pending with boarding address
    layer: (tx.confirmations === 0 && tx.settled) ? 'offchain' : 'onchain',
  }));
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
