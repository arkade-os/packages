import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Client,
  type BtcToEvmSwapResponse,
  type EvmToBtcSwapResponse,
  type QuoteResponse,
} from '@lendasat/lendaswap-sdk';

const LENDASWAP_API_URL =
  import.meta.env.DEV
    ? `${window.location.origin}/lendaswap-api`
    : 'https://apilendaswap.lendasat.com';
const LENDASWAP_TOKEN = 'usdt0_pol';
const POLYGON_CHAIN_ID = '0x89';
const POLYGON_PARAMS = {
  chainId: POLYGON_CHAIN_ID,
  chainName: 'Polygon Mainnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: ['https://polygon-rpc.com/'],
  blockExplorerUrls: ['https://polygonscan.com/'],
};

export type SwapDirection = 'arkade-to-evm' | 'evm-to-arkade';

export interface UseSwapOptions {
  currentNetwork: string;
  sendBitcoin: (toAddress: string, amount: number) => Promise<string>;
  arkadeAddress?: string;
}

export interface UseSwapReturn {
  // Direction
  direction: SwapDirection;
  setDirection: (dir: SwapDirection) => void;
  flipDirection: () => void;

  // Amounts
  sourceAmount: string;
  setSourceAmount: (amount: string) => void;
  arkadeReceiveAddress: string;
  setArkadeReceiveAddress: (address: string) => void;

  // Quote
  quote: QuoteResponse | null;
  isQuoting: boolean;
  getQuote: () => Promise<void>;

  // Swap state
  arkadeToEvmSwap: BtcToEvmSwapResponse | null;
  evmToArkadeSwap: EvmToBtcSwapResponse | null;
  isCreatingSwap: boolean;
  createSwap: () => Promise<void>;

  // Fund & Claim
  isFundingVhtlc: boolean;
  fundVhtlc: () => Promise<void>;
  isClaimingSwap: boolean;
  claimSwap: () => Promise<void>;
  isRefreshingSwap: boolean;
  refreshSwap: () => Promise<void>;
  resetSwap: () => void;

  // EVM wallet
  evmAddress: string;
  evmChainId: string;
  isPolygonNetwork: boolean;
  isEvmConnecting: boolean;
  evmError: string;
  connectMetaMask: () => Promise<void>;
  disconnectEvm: () => void;

  // Client state
  clientStatus: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  clearError: () => void;

  // Available check
  isAvailable: boolean;
}

export function useSwap({
  currentNetwork,
  sendBitcoin,
  arkadeAddress,
}: UseSwapOptions): UseSwapReturn {
  // Direction
  const [direction, setDirection] = useState<SwapDirection>('arkade-to-evm');

  // Amounts
  const [sourceAmount, setSourceAmount] = useState('');
  const [arkadeReceiveAddress, setArkadeReceiveAddress] = useState('');

  // Quote
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  // Swap state
  const [arkadeToEvmSwap, setArkadeToEvmSwap] = useState<BtcToEvmSwapResponse | null>(null);
  const [evmToArkadeSwap, setEvmToArkadeSwap] = useState<EvmToBtcSwapResponse | null>(null);
  const [isCreatingSwap, setIsCreatingSwap] = useState(false);

  // Fund & Claim
  const [isFundingVhtlc, setIsFundingVhtlc] = useState(false);
  const [isClaimingSwap, setIsClaimingSwap] = useState(false);
  const [isRefreshingSwap, setIsRefreshingSwap] = useState(false);

  // EVM wallet
  const [evmAddress, setEvmAddress] = useState('');
  const [evmChainId, setEvmChainId] = useState('');
  const [isEvmConnecting, setIsEvmConnecting] = useState(false);
  const [evmError, setEvmError] = useState('');

  // Client
  const [client, setClient] = useState<Client | null>(null);
  const [clientStatus, setClientStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const clientInitRef = useRef<Promise<Client> | null>(null);

  const isPolygonNetwork = evmChainId?.toLowerCase() === POLYGON_CHAIN_ID;
  const isAvailable = currentNetwork === 'bitcoin';

  // Set arkade receive address from wallet
  useEffect(() => {
    if (arkadeAddress && !arkadeReceiveAddress) {
      setArkadeReceiveAddress(arkadeAddress);
    }
  }, [arkadeAddress, arkadeReceiveAddress]);

  // Load EVM state on mount
  const loadEvmState = useCallback(async () => {
    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.request) return;

    try {
      const [accounts, chainId] = await Promise.all([
        ethereum.request({ method: 'eth_accounts' }),
        ethereum.request({ method: 'eth_chainId' }),
      ]);
      setEvmAddress(accounts?.[0] ?? '');
      setEvmChainId(chainId ?? '');
    } catch (err) {
      console.warn('Failed to load EVM state:', err);
    }
  }, []);

  useEffect(() => {
    void loadEvmState();
  }, [loadEvmState]);

  // Listen for EVM account/chain changes
  useEffect(() => {
    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setEvmAddress(accounts?.[0] ?? '');
    };

    const handleChainChanged = (chainId: string) => {
      setEvmChainId(chainId ?? '');
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  // Initialize Lendaswap client
  const initClient = useCallback(async () => {
    if (client) return client;
    if (clientInitRef.current) return clientInitRef.current;

    setClientStatus('loading');
    setError('');

    const initPromise = (async () => {
      console.log('[Lendaswap] Initializing client with URL:', LENDASWAP_API_URL);
      const newClient = await Client.builder()
        .url(LENDASWAP_API_URL)
        .withIdbStorage()
        .network('bitcoin')
        .arkadeUrl('https://arkade.computer')
        .esploraUrl('https://mempool.space/api')
        .build();

      console.log('[Lendaswap] Client built, calling init...');
      await newClient.init();
      console.log('[Lendaswap] Client initialized successfully');
      setClient(newClient);
      setClientStatus('ready');

      // Load pending swaps from storage
      try {
        const allSwaps = await newClient.listAllSwaps();
        console.log('[Lendaswap] Loaded swaps from storage:', allSwaps);
        if (allSwaps && allSwaps.length > 0) {
          const pendingArkadeSwaps = allSwaps
            .map((s: any) => s.response || s)
            .filter(
              (swap: any) =>
                swap.htlc_address_arkade && swap.status !== 'Completed' && swap.status !== 'Refunded'
            );

          if (pendingArkadeSwaps.length > 0) {
            const swap = pendingArkadeSwaps[pendingArkadeSwaps.length - 1];
            console.log('[Lendaswap] Restoring pending swap:', swap);
            setArkadeToEvmSwap(swap as unknown as BtcToEvmSwapResponse);
          }
        }
      } catch (err) {
        console.warn('[Lendaswap] Failed to load swaps:', err);
      }

      return newClient;
    })();

    clientInitRef.current = initPromise;

    try {
      return await initPromise;
    } catch (err: any) {
      setClientStatus('error');
      setError(err?.message ?? 'Failed to initialize Lendaswap');
      throw err;
    } finally {
      clientInitRef.current = null;
    }
  }, [client]);

  // Auto-initialize on bitcoin mainnet
  useEffect(() => {
    if (currentNetwork === 'bitcoin') {
      initClient().catch(() => {});
    }
  }, [currentNetwork, initClient]);

  // Connect MetaMask
  const connectMetaMask = useCallback(async () => {
    setEvmError('');
    setIsEvmConnecting(true);

    try {
      const ethereum = (window as any)?.ethereum;
      if (!ethereum?.request) {
        throw new Error('MetaMask not found. Please install MetaMask to continue.');
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      let chainId = await ethereum.request({ method: 'eth_chainId' });

      if (chainId?.toLowerCase() !== POLYGON_CHAIN_ID) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: POLYGON_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError?.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [POLYGON_PARAMS],
            });
          } else {
            throw switchError;
          }
        }
        chainId = await ethereum.request({ method: 'eth_chainId' });
      }

      setEvmAddress(accounts?.[0] ?? '');
      setEvmChainId(chainId ?? '');
      setEvmError('');
    } catch (err: any) {
      setEvmError(err?.message ?? 'Failed to connect MetaMask');
    } finally {
      setIsEvmConnecting(false);
    }
  }, []);

  const disconnectEvm = useCallback(() => {
    setEvmAddress('');
    setEvmChainId('');
  }, []);

  // Get quote (Arkade → EVM only)
  const getQuote = useCallback(async () => {
    setError('');
    setQuote(null);

    const amount = parseSatsInput(sourceAmount);
    if (!amount || amount <= 0n) {
      setError('Enter a valid sats amount to quote.');
      return;
    }

    setIsQuoting(true);
    try {
      const c = await initClient();
      console.log('[Lendaswap] Getting quote for amount:', amount.toString());
      const q = await c.getQuote('btc_arkade', LENDASWAP_TOKEN, amount);
      console.log('[Lendaswap] Quote received:', q);
      setQuote(q);
    } catch (err: any) {
      console.error('[Lendaswap] Quote error:', err);
      setError(err?.message ?? 'Failed to fetch quote.');
    } finally {
      setIsQuoting(false);
    }
  }, [sourceAmount, initClient]);

  // Create swap
  const createSwap = useCallback(async () => {
    setError('');

    if (direction === 'arkade-to-evm') {
      const amount = parseSatsInput(sourceAmount);
      if (!amount || amount <= 0n) {
        setError('Enter a valid sats amount to swap.');
        return;
      }
      if (!evmAddress) {
        setError('Connect MetaMask on Polygon to receive USDT.');
        return;
      }
      if (!isPolygonNetwork) {
        setError('Switch MetaMask to Polygon to continue.');
        return;
      }

      setIsCreatingSwap(true);
      try {
        const c = await initClient();
        const swap = await c.createArkadeToEvmSwap(
          {
            target_address: evmAddress,
            source_amount: amount,
            target_token: LENDASWAP_TOKEN,
          },
          'polygon'
        );
        setArkadeToEvmSwap(swap);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to create swap.');
      } finally {
        setIsCreatingSwap(false);
      }
    } else {
      const amount = Number(sourceAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Enter a valid USDT amount to swap.');
        return;
      }
      if (!evmAddress) {
        setError('Connect MetaMask on Polygon to continue.');
        return;
      }
      if (!arkadeReceiveAddress) {
        setError('Enter an Arkade address to receive BTC.');
        return;
      }
      if (!isPolygonNetwork) {
        setError('Switch MetaMask to Polygon to continue.');
        return;
      }

      setIsCreatingSwap(true);
      try {
        const c = await initClient();
        const swap = await c.createEvmToArkadeSwap(
          {
            target_address: arkadeReceiveAddress,
            source_amount: amount,
            source_token: LENDASWAP_TOKEN,
            user_address: evmAddress,
          },
          'polygon'
        );
        setEvmToArkadeSwap(swap);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to create swap.');
      } finally {
        setIsCreatingSwap(false);
      }
    }
  }, [direction, sourceAmount, evmAddress, isPolygonNetwork, arkadeReceiveAddress, initClient]);

  // Fund VHTLC (Arkade → EVM)
  const fundVhtlc = useCallback(async () => {
    if (!arkadeToEvmSwap?.htlc_address_arkade || !arkadeToEvmSwap?.source_amount) {
      setError('No VHTLC address or amount available.');
      return;
    }

    setIsFundingVhtlc(true);
    setError('');
    try {
      const amount =
        typeof arkadeToEvmSwap.source_amount === 'bigint'
          ? Number(arkadeToEvmSwap.source_amount)
          : arkadeToEvmSwap.source_amount;
      console.log('[Lendaswap] Funding VHTLC:', arkadeToEvmSwap.htlc_address_arkade, 'with', amount, 'sats');
      const txid = await sendBitcoin(arkadeToEvmSwap.htlc_address_arkade, amount);
      console.log('[Lendaswap] VHTLC funded, txid:', txid);
      alert(`VHTLC funded! TXID: ${txid}\n\nClick Refresh to update status, then Claim when ready.`);
    } catch (err: any) {
      console.error('[Lendaswap] Fund error:', err);
      setError(err?.message ?? 'Failed to fund VHTLC.');
    } finally {
      setIsFundingVhtlc(false);
    }
  }, [arkadeToEvmSwap, sendBitcoin]);

  // Claim swap
  const claimSwap = useCallback(async () => {
    setIsClaimingSwap(true);
    try {
      const c = await initClient();
      if (direction === 'arkade-to-evm' && arkadeToEvmSwap) {
        await c.claimGelato(arkadeToEvmSwap.id);
        alert('Claim submitted via Gelato! USDT will arrive after confirmation.');
      } else if (direction === 'evm-to-arkade' && evmToArkadeSwap) {
        await c.claimVhtlc(evmToArkadeSwap.id);
        alert('Claim submitted! BTC will arrive in your Arkade wallet after confirmation.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to claim swap.');
    } finally {
      setIsClaimingSwap(false);
    }
  }, [direction, arkadeToEvmSwap, evmToArkadeSwap, initClient]);

  // Refresh swap status
  const refreshSwap = useCallback(async () => {
    setIsRefreshingSwap(true);
    setError('');
    try {
      const c = await initClient();
      if (direction === 'arkade-to-evm' && arkadeToEvmSwap) {
        console.log('[Lendaswap] Refreshing swap:', arkadeToEvmSwap.id);
        const refreshed = await c.getSwap(arkadeToEvmSwap.id);
        const swap = (refreshed as any)?.response || refreshed;
        console.log('[Lendaswap] Refreshed swap:', swap);
        setArkadeToEvmSwap(swap as unknown as BtcToEvmSwapResponse);
      } else if (direction === 'evm-to-arkade' && evmToArkadeSwap) {
        const refreshed = await c.getSwap(evmToArkadeSwap.id);
        setEvmToArkadeSwap(refreshed as unknown as EvmToBtcSwapResponse);
      }
    } catch (err: any) {
      console.error('[Lendaswap] Refresh error:', err);
      setError(err?.message ?? 'Failed to refresh swap.');
    } finally {
      setIsRefreshingSwap(false);
    }
  }, [direction, arkadeToEvmSwap, evmToArkadeSwap, initClient]);

  // Reset swap
  const resetSwap = useCallback(() => {
    if (direction === 'arkade-to-evm') {
      setArkadeToEvmSwap(null);
      setQuote(null);
    } else {
      setEvmToArkadeSwap(null);
    }
    setSourceAmount('');
    setError('');
  }, [direction]);

  const flipDirection = useCallback(() => {
    setDirection((d) => (d === 'arkade-to-evm' ? 'evm-to-arkade' : 'arkade-to-evm'));
    setQuote(null);
    setSourceAmount('');
    setError('');
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return {
    // Direction
    direction,
    setDirection,
    flipDirection,

    // Amounts
    sourceAmount,
    setSourceAmount,
    arkadeReceiveAddress,
    setArkadeReceiveAddress,

    // Quote
    quote,
    isQuoting,
    getQuote,

    // Swap state
    arkadeToEvmSwap,
    evmToArkadeSwap,
    isCreatingSwap,
    createSwap,

    // Fund & Claim
    isFundingVhtlc,
    fundVhtlc,
    isClaimingSwap,
    claimSwap,
    isRefreshingSwap,
    refreshSwap,
    resetSwap,

    // EVM wallet
    evmAddress,
    evmChainId,
    isPolygonNetwork,
    isEvmConnecting,
    evmError,
    connectMetaMask,
    disconnectEvm,

    // Client state
    clientStatus,
    error,
    clearError,

    // Available check
    isAvailable,
  };
}

function parseSatsInput(value: string): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}
