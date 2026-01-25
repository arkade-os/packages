import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useArkadeWallet } from '@arkade-os/sats-connect-react';
import {
  Client,
  swapStatusToString,
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

export const Dashboard: React.FC = () => {
  const {
    walletInfo,
    balance,
    isLoading,
    error,
    getBalance,
    sendBitcoin,
    onboardFunds,
    payLightningInvoice,
    createLightningInvoice,
    currentNetwork,
  } = useArkadeWallet();

  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [lightningInvoice, setLightningInvoice] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState('');
  const [lendaswapAmount, setLendaswapAmount] = useState('');
  const [lendaswapQuote, setLendaswapQuote] = useState<QuoteResponse | null>(null);
  const [lendaswapSwap, setLendaswapSwap] = useState<BtcToEvmSwapResponse | null>(null);
  const [evmToArkadeSwap, setEvmToArkadeSwap] = useState<EvmToBtcSwapResponse | null>(null);
  const [lendaswapClient, setLendaswapClient] = useState<Client | null>(null);
  const [lendaswapStatus, setLendaswapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [lendaswapError, setLendaswapError] = useState('');
  const [isQuoting, setIsQuoting] = useState(false);
  const [isCreatingSwap, setIsCreatingSwap] = useState(false);
  const [isClaimingSwap, setIsClaimingSwap] = useState(false);
  const [isRefreshingSwap, setIsRefreshingSwap] = useState(false);
  const [isRefreshingEvmSwap, setIsRefreshingEvmSwap] = useState(false);
  const [isClaimingEvmSwap, setIsClaimingEvmSwap] = useState(false);
  const [lendaswapDirection, setLendaswapDirection] = useState<'arkade-to-evm' | 'evm-to-arkade'>(
    'arkade-to-evm'
  );
  const [evmToArkadeAmount, setEvmToArkadeAmount] = useState('');
  const [arkadeReceiveAddress, setArkadeReceiveAddress] = useState('');
  const [evmAddress, setEvmAddress] = useState('');
  const [evmChainId, setEvmChainId] = useState('');
  const [evmError, setEvmError] = useState('');
  const [isEvmConnecting, setIsEvmConnecting] = useState(false);
  const [isFundingVhtlc, setIsFundingVhtlc] = useState(false);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
  const lendaswapInitRef = useRef<Promise<Client> | null>(null);

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (walletInfo) {
      const interval = setInterval(() => {
        getBalance({ silent: true }).catch(() => {});
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [walletInfo, getBalance]);

  const initLendaswap = useCallback(async () => {
    if (lendaswapClient) {
      return lendaswapClient;
    }
    if (lendaswapInitRef.current) {
      return lendaswapInitRef.current;
    }

    setLendaswapStatus('loading');
    setLendaswapError('');

    const initPromise = (async () => {
      console.log('[Lendaswap] Initializing client with URL:', LENDASWAP_API_URL);
      const client = await Client.builder()
        .url(LENDASWAP_API_URL)
        .withIdbStorage()
        .network('bitcoin')
        .arkadeUrl('https://arkade.computer')
        .esploraUrl('https://mempool.space/api')
        .build();

      console.log('[Lendaswap] Client built, calling init...');
      await client.init();
      console.log('[Lendaswap] Client initialized successfully');
      setLendaswapClient(client);
      setLendaswapStatus('ready');

      // Load pending swaps from storage
      try {
        const allSwaps = await client.listAllSwaps();
        console.log('[Lendaswap] Loaded swaps from storage:', allSwaps);
        if (allSwaps && allSwaps.length > 0) {
          // Find pending Arkade→EVM swaps (newest first)
          // Swaps are wrapped in {response: ..., swap_params: ...}
          const pendingArkadeSwaps = allSwaps
            .map((s: any) => s.response || s)
            .filter((swap: any) => swap.htlc_address_arkade && swap.status !== 'Completed' && swap.status !== 'Refunded');

          console.log('[Lendaswap] Pending Arkade swaps:', pendingArkadeSwaps);

          // Pick the last one (most recent)
          if (pendingArkadeSwaps.length > 0) {
            const swap = pendingArkadeSwaps[pendingArkadeSwaps.length - 1];
            console.log('[Lendaswap] Restoring pending swap:', swap);
            setLendaswapSwap(swap as unknown as BtcToEvmSwapResponse);
          }
        }
      } catch (err) {
        console.warn('[Lendaswap] Failed to load swaps:', err);
      }

      return client;
    })();

    lendaswapInitRef.current = initPromise;

    try {
      return await initPromise;
    } catch (err: any) {
      setLendaswapStatus('error');
      setLendaswapError(err?.message ?? 'Failed to initialize Lendaswap');
      throw err;
    } finally {
      lendaswapInitRef.current = null;
    }
  }, [lendaswapClient, lendaswapInitRef]);

  const loadEvmState = useCallback(async () => {
    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.request) {
      return;
    }

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

  useEffect(() => {
    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.on) {
      return;
    }

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

  useEffect(() => {
    if (walletInfo && currentNetwork === 'bitcoin') {
      initLendaswap().catch(() => {});
    }
  }, [walletInfo, currentNetwork, initLendaswap]);

  useEffect(() => {
    if (walletInfo?.arkAddress && !arkadeReceiveAddress) {
      setArkadeReceiveAddress(walletInfo.arkAddress);
    }
  }, [walletInfo, arkadeReceiveAddress]);

  const handleSend = async () => {
    try {
      const amount = parseInt(sendAmount);
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const txid = await sendBitcoin(sendAddress, amount);
      alert(`Transaction sent! TXID: ${txid}`);
      setSendAddress('');
      setSendAmount('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleOnboard = async () => {
    try {
      const txid = await onboardFunds();
      alert(`Funds onboarded! TXID: ${txid}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handlePayInvoice = async () => {
    try {
      const preimage = await payLightningInvoice(lightningInvoice);
      alert(`Invoice paid! Preimage: ${preimage}`);
      setLightningInvoice('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const amount = parseInt(receiveAmount);
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const invoice = await createLightningInvoice(amount, 'Arkade payment');
      setCreatedInvoice(invoice);
      alert(`Invoice created! It will auto-claim when paid.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const parseSatsInput = (value: string) => {
    if (!value || !/^\d+$/.test(value)) {
      return null;
    }
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  };

  const formatSatsValue = (value?: bigint | number | null) => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'bigint') {
      return `${value.toString()} sats`;
    }
    return `${value.toLocaleString()} sats`;
  };

  const formatTokenAmount = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    return value.toLocaleString();
  };

  const formatAddress = (address?: string) => {
    if (!address) {
      return '';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const connectMetaMask = async () => {
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
  };

  const handleLendaswapQuote = async () => {
    setLendaswapError('');
    setLendaswapQuote(null);

    const amount = parseSatsInput(lendaswapAmount);
    if (!amount || amount <= 0n) {
      setLendaswapError('Enter a valid sats amount to quote.');
      return;
    }

    setIsQuoting(true);
    try {
      console.log('[Lendaswap] Getting quote for amount:', amount.toString());
      const client = await initLendaswap();
      console.log('[Lendaswap] Client ready, fetching quote...');
      const quote = await client.getQuote('btc_arkade', LENDASWAP_TOKEN, amount);
      console.log('[Lendaswap] Quote received:', quote);
      setLendaswapQuote(quote);
    } catch (err: any) {
      console.error('[Lendaswap] Quote error:', err);
      setLendaswapError(err?.message ?? 'Failed to fetch quote.');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleCreateLendaswapSwap = async () => {
    setLendaswapError('');

    const amount = parseSatsInput(lendaswapAmount);
    if (!amount || amount <= 0n) {
      setLendaswapError('Enter a valid sats amount to swap.');
      return;
    }

    if (!evmAddress) {
      setLendaswapError('Connect MetaMask on Polygon to receive USDT.');
      return;
    }

    if (evmChainId && evmChainId.toLowerCase() !== POLYGON_CHAIN_ID) {
      setLendaswapError('Switch MetaMask to Polygon to continue.');
      return;
    }

    setIsCreatingSwap(true);
    try {
      const client = await initLendaswap();
      const swap = await client.createArkadeToEvmSwap(
        {
          target_address: evmAddress,
          source_amount: amount,
          target_token: LENDASWAP_TOKEN,
        },
        'polygon'
      );
      setLendaswapSwap(swap);
    } catch (err: any) {
      setLendaswapError(err?.message ?? 'Failed to create swap.');
    } finally {
      setIsCreatingSwap(false);
    }
  };

  const handleRefreshLendaswapSwap = async () => {
    if (!lendaswapSwap) {
      return;
    }

    setIsRefreshingSwap(true);
    setLendaswapError('');
    try {
      const client = await initLendaswap();
      console.log('[Lendaswap] Refreshing swap:', lendaswapSwap.id);
      const refreshed = await client.getSwap(lendaswapSwap.id);
      console.log('[Lendaswap] Refreshed swap raw:', refreshed);
      // Unwrap if needed - response may be wrapped in {response: ..., swap_params: ...}
      const swap = (refreshed as any)?.response || refreshed;
      console.log('[Lendaswap] Refreshed swap:', swap);
      setLendaswapSwap(swap as unknown as BtcToEvmSwapResponse);
    } catch (err: any) {
      console.error('[Lendaswap] Refresh error:', err);
      setLendaswapError(err?.message ?? 'Failed to refresh swap.');
    } finally {
      setIsRefreshingSwap(false);
    }
  };

  const handleClaimLendaswapSwap = async () => {
    if (!lendaswapSwap) {
      return;
    }

    setIsClaimingSwap(true);
    try {
      const client = await initLendaswap();
      await client.claimGelato(lendaswapSwap.id);
      alert('Claim submitted via Gelato! USDT will arrive after confirmation.');
    } catch (err: any) {
      setLendaswapError(err?.message ?? 'Failed to claim swap.');
    } finally {
      setIsClaimingSwap(false);
    }
  };

  const handleCreateEvmToArkadeSwap = async () => {
    setLendaswapError('');

    const amount = Number(evmToArkadeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLendaswapError('Enter a valid USDT amount to swap.');
      return;
    }

    if (!evmAddress) {
      setLendaswapError('Connect MetaMask on Polygon to continue.');
      return;
    }

    if (!arkadeReceiveAddress) {
      setLendaswapError('Enter an Arkade address to receive BTC.');
      return;
    }

    if (evmChainId && evmChainId.toLowerCase() !== POLYGON_CHAIN_ID) {
      setLendaswapError('Switch MetaMask to Polygon to continue.');
      return;
    }

    setIsCreatingSwap(true);
    try {
      const client = await initLendaswap();
      const swap = await client.createEvmToArkadeSwap(
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
      setLendaswapError(err?.message ?? 'Failed to create swap.');
    } finally {
      setIsCreatingSwap(false);
    }
  };

  const handleRefreshEvmToArkadeSwap = async () => {
    if (!evmToArkadeSwap) {
      return;
    }

    setIsRefreshingEvmSwap(true);
    try {
      const client = await initLendaswap();
      const refreshed = await client.getSwap(evmToArkadeSwap.id);
      setEvmToArkadeSwap(refreshed as unknown as EvmToBtcSwapResponse);
    } catch (err: any) {
      setLendaswapError(err?.message ?? 'Failed to refresh swap.');
    } finally {
      setIsRefreshingEvmSwap(false);
    }
  };

  const handleClaimEvmToArkadeSwap = async () => {
    if (!evmToArkadeSwap) {
      return;
    }

    setIsClaimingEvmSwap(true);
    try {
      const client = await initLendaswap();
      await client.claimVhtlc(evmToArkadeSwap.id);
      alert('Claim submitted! BTC will arrive in your Arkade wallet after confirmation.');
    } catch (err: any) {
      setLendaswapError(err?.message ?? 'Failed to claim swap.');
    } finally {
      setIsClaimingEvmSwap(false);
    }
  };

  const handleFundVhtlc = async () => {
    if (!lendaswapSwap?.htlc_address_arkade || !lendaswapSwap?.source_amount) {
      setLendaswapError('No VHTLC address or amount available.');
      return;
    }

    setIsFundingVhtlc(true);
    setLendaswapError('');
    try {
      const amount =
        typeof lendaswapSwap.source_amount === 'bigint'
          ? Number(lendaswapSwap.source_amount)
          : lendaswapSwap.source_amount;
      console.log('[Lendaswap] Funding VHTLC:', lendaswapSwap.htlc_address_arkade, 'with', amount, 'sats');
      const txid = await sendBitcoin(lendaswapSwap.htlc_address_arkade, amount);
      console.log('[Lendaswap] VHTLC funded, txid:', txid);
      alert(`VHTLC funded! TXID: ${txid}\n\nClick Refresh to update status, then Claim when ready.`);
    } catch (err: any) {
      console.error('[Lendaswap] Fund error:', err);
      setLendaswapError(err?.message ?? 'Failed to fund VHTLC.');
    } finally {
      setIsFundingVhtlc(false);
    }
  };

  const handleResetLendaswap = () => {
    setLendaswapSwap(null);
    setLendaswapQuote(null);
  };

  const handleResetEvmToArkadeSwap = () => {
    setEvmToArkadeSwap(null);
  };

  const formatSats = (sats: number) => {
    return sats.toLocaleString() + ' sats';
  };

  const isPolygonNetwork = evmChainId?.toLowerCase() === POLYGON_CHAIN_ID;

  if (!walletInfo) {
    return null;
  }

  return (
    <div style={styles.dashboard}>
      <div style={styles.header}>
        <h2>Arkade Wallet Dashboard</h2>
        <div style={styles.networkBadge}>
          Network: {currentNetwork}
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* Wallet Info */}
      <div style={styles.section}>
        <h3>Wallet Information</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <strong>Ark Address:</strong>
            <code style={styles.code}>{walletInfo.arkAddress}</code>
          </div>
          <div style={styles.infoItem}>
            <strong>Boarding Address:</strong>
            <code style={styles.code}>{walletInfo.boardingAddress}</code>
          </div>
          <div style={styles.infoItem}>
            <strong>Payment Address:</strong>
            <code style={styles.code}>{walletInfo.paymentAddress}</code>
          </div>
          {walletInfo.ordinalsAddress && (
            <div style={styles.infoItem}>
              <strong>Ordinals Address:</strong>
              <code style={styles.code}>{walletInfo.ordinalsAddress}</code>
            </div>
          )}
        </div>
      </div>

      {/* Balance */}
      <div style={styles.section}>
        <div style={styles.balanceHeader}>
          <h3>Balance</h3>
          <button
            onClick={() => {
              void getBalance();
            }}
            disabled={isLoading}
            style={styles.button}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {balance && (
          <div style={styles.balanceGrid}>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Total</div>
              <div style={styles.balanceValue}>{formatSats(balance.total)}</div>
            </div>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>On-chain</div>
              <div style={styles.balanceValue}>{formatSats(balance.onchain)}</div>
            </div>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Off-chain (VTXOs)</div>
              <div style={styles.balanceValue}>{formatSats(balance.offchain)}</div>
            </div>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Settled</div>
              <div style={styles.balanceValue}>{formatSats(balance.settled)}</div>
            </div>
          </div>
        )}

        {balance && balance.onchain > 0 && (
          <div style={styles.onboardSection}>
            <p>You have {formatSats(balance.onchain)} in your boarding address.</p>
            <button onClick={handleOnboard} disabled={isLoading} style={styles.button}>
              {isLoading ? 'Onboarding...' : 'Onboard Funds to VTXOs'}
            </button>
          </div>
        )}
      </div>

      {/* Send Bitcoin */}
      <div style={styles.section}>
        <h3>Send Bitcoin</h3>
        <div style={styles.form}>
          <input
            type="text"
            placeholder="Recipient address"
            value={sendAddress}
            onChange={(e) => setSendAddress(e.target.value)}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Amount (sats)"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleSend} disabled={isLoading} style={styles.button}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Lightning Network */}
      {currentNetwork === 'bitcoin' && (
        <>
          <div style={styles.section}>
            <h3>Pay Lightning Invoice</h3>
            <div style={styles.form}>
              <input
                type="text"
                placeholder="Lightning invoice (lnbc...)"
                value={lightningInvoice}
                onChange={(e) => setLightningInvoice(e.target.value)}
                style={styles.input}
              />
              <button onClick={handlePayInvoice} disabled={isLoading} style={styles.button}>
                {isLoading ? 'Paying...' : 'Pay Invoice'}
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <h3>Create Lightning Invoice</h3>
            <div style={styles.form}>
              <input
                type="number"
                placeholder="Amount (sats)"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                style={styles.input}
              />
              <button onClick={handleCreateInvoice} disabled={isLoading} style={styles.button}>
                {isLoading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
            {createdInvoice && (
              <div style={styles.invoiceResult}>
                <strong>Created Invoice:</strong>
                <code style={styles.code}>{createdInvoice}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvoice);
                    alert('Invoice copied to clipboard!');
                  }}
                  style={styles.button}
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lendaswap */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3>Lendaswap: Arkade ↔ USDT (Polygon)</h3>
          <span style={styles.badge}>Polygon • USDT</span>
        </div>

        <div style={styles.swapToggle}>
          <button
            onClick={() => {
              setLendaswapDirection('arkade-to-evm');
              setLendaswapError('');
            }}
            style={
              lendaswapDirection === 'arkade-to-evm'
                ? styles.swapToggleActive
                : styles.swapToggleButton
            }
          >
            Arkade → USDT
          </button>
          <button
            onClick={() => {
              setLendaswapDirection('evm-to-arkade');
              setLendaswapError('');
            }}
            style={
              lendaswapDirection === 'evm-to-arkade'
                ? styles.swapToggleActive
                : styles.swapToggleButton
            }
          >
            USDT → Arkade
          </button>
        </div>

        {currentNetwork !== 'bitcoin' ? (
          <p style={styles.note}>
            Lendaswap swaps are available on Bitcoin mainnet. Switch your Arkade network to bitcoin
            to enable this flow.
          </p>
        ) : (
          <>
            <p style={styles.note}>
              {lendaswapDirection === 'arkade-to-evm'
                ? 'Swap Arkade BTC to USDT on Polygon. Fund the Arkade VHTLC, then claim via Gelato.'
                : 'Swap USDT on Polygon to BTC on Arkade. Fund the EVM HTLC, then claim to your Arkade address.'}{' '}
              BTC on Arkade is held via Xverse; Polygon USDT is held via MetaMask.
            </p>

            <div style={styles.swapPanel}>
              <div style={styles.swapColumn}>
                <h4 style={styles.swapTitle}>1. Connect MetaMask</h4>
                {evmAddress ? (
                  <>
                    <div style={styles.swapRow}>
                      <span style={styles.swapLabel}>Wallet</span>
                      <strong>{formatAddress(evmAddress)}</strong>
                    </div>
                    <div style={styles.swapRow}>
                      <span style={styles.swapLabel}>Network</span>
                      <span style={isPolygonNetwork ? styles.statusGood : styles.statusWarn}>
                        {isPolygonNetwork ? 'Polygon' : evmChainId || 'Unknown'}
                      </span>
                    </div>
                    <div style={styles.swapActions}>
                      <button
                        onClick={() => {
                          setEvmAddress('');
                          setEvmChainId('');
                        }}
                        style={styles.buttonSecondary}
                      >
                        Clear
                      </button>
                      {!isPolygonNetwork && (
                        <button onClick={connectMetaMask} style={styles.button}>
                          Switch to Polygon
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={styles.note}>
                      {lendaswapDirection === 'arkade-to-evm'
                        ? 'Connect MetaMask to receive USDT on Polygon.'
                        : 'Connect MetaMask to send USDT from Polygon.'}
                    </p>
                    <button
                      onClick={connectMetaMask}
                      disabled={isEvmConnecting}
                      style={styles.button}
                    >
                      {isEvmConnecting ? 'Connecting...' : 'Connect MetaMask'}
                    </button>
                  </>
                )}
                {evmError && <div style={styles.errorInline}>{evmError}</div>}
              </div>

              {lendaswapDirection === 'arkade-to-evm' ? (
                <>
                  <div style={styles.swapColumn}>
                    <h4 style={styles.swapTitle}>2. Quote & Create Swap</h4>
                    <label style={styles.swapLabel}>Sats to swap (Arkade)</label>
                    <input
                      type="number"
                      placeholder="Amount in sats"
                      value={lendaswapAmount}
                      onChange={(e) => setLendaswapAmount(e.target.value)}
                      style={styles.input}
                    />
                    <div style={styles.swapActions}>
                      <button
                        onClick={handleLendaswapQuote}
                        disabled={!lendaswapAmount || isQuoting || lendaswapStatus === 'loading'}
                        style={styles.buttonSecondary}
                      >
                        {isQuoting ? 'Quoting...' : 'Get Quote'}
                      </button>
                      <button
                        onClick={handleCreateLendaswapSwap}
                        disabled={
                          !lendaswapAmount ||
                          !evmAddress ||
                          !isPolygonNetwork ||
                          isCreatingSwap ||
                          lendaswapStatus === 'loading'
                        }
                        style={styles.button}
                      >
                        {isCreatingSwap ? 'Creating...' : 'Create Swap'}
                      </button>
                    </div>
                    {lendaswapStatus === 'loading' && (
                      <p style={styles.note}>Initializing Lendaswap client…</p>
                    )}
                    {lendaswapQuote && (
                      <div style={styles.quoteCard}>
                        <div style={styles.quoteRow}>
                          <span style={styles.swapLabel}>Exchange rate</span>
                          <strong>{lendaswapQuote.exchangeRate}</strong>
                        </div>
                        <div style={styles.quoteRow}>
                          <span style={styles.swapLabel}>Protocol fee</span>
                          <span>{formatSatsValue(lendaswapQuote.protocolFee)}</span>
                        </div>
                        <div style={styles.quoteRow}>
                          <span style={styles.swapLabel}>Network fee</span>
                          <span>{formatSatsValue(lendaswapQuote.networkFee)}</span>
                        </div>
                        <div style={styles.quoteRow}>
                          <span style={styles.swapLabel}>Min / Max</span>
                          <span>
                            {formatSatsValue(lendaswapQuote.minAmount)} •{' '}
                            {formatSatsValue(lendaswapQuote.maxAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.swapColumn}>
                    <h4 style={styles.swapTitle}>3. Fund & Claim</h4>
                    {lendaswapSwap ? (
                      <>
                        <div style={styles.swapRow}>
                          <span style={styles.swapLabel}>Status</span>
                          <span style={styles.statusPill}>
                            {swapStatusToString(lendaswapSwap.status)}
                          </span>
                        </div>
                        <div style={styles.swapRow}>
                          <span style={styles.swapLabel}>Send sats</span>
                          <strong>{formatSatsValue(lendaswapSwap.source_amount)}</strong>
                        </div>
                        <div style={styles.swapRow}>
                          <span style={styles.swapLabel}>Receive USDT</span>
                          <strong>{formatTokenAmount(lendaswapSwap.target_amount)}</strong>
                        </div>
                        {lendaswapSwap.htlc_address_arkade && (
                          <div style={styles.swapDetail}>
                            <span style={styles.swapLabel}>Arkade VHTLC address</span>
                            <code style={styles.code}>{lendaswapSwap.htlc_address_arkade}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(lendaswapSwap.htlc_address_arkade);
                                alert('Arkade VHTLC address copied!');
                              }}
                              style={styles.buttonSmall}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                        <div style={styles.swapActions}>
                          <button
                            onClick={handleFundVhtlc}
                            disabled={isFundingVhtlc || isLoading}
                            style={styles.button}
                          >
                            {isFundingVhtlc ? 'Funding...' : 'Fund VHTLC'}
                          </button>
                          <button
                            onClick={handleRefreshLendaswapSwap}
                            disabled={isRefreshingSwap}
                            style={styles.buttonSecondary}
                          >
                            {isRefreshingSwap ? 'Refreshing...' : 'Refresh'}
                          </button>
                        </div>
                        <div style={styles.swapActions}>
                          <button
                            onClick={handleClaimLendaswapSwap}
                            disabled={isClaimingSwap}
                            style={styles.button}
                          >
                            {isClaimingSwap ? 'Claiming...' : 'Claim USDT (Gelato)'}
                          </button>
                          <button onClick={handleResetLendaswap} style={styles.buttonSecondary}>
                            Clear
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={styles.note}>
                        Create a swap to get the Arkade VHTLC address you need to fund.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.swapColumn}>
                    <h4 style={styles.swapTitle}>2. Set Receive & Create Swap</h4>
                    <label style={styles.swapLabel}>Arkade receive address</label>
                    <input
                      type="text"
                      placeholder="Arkade address"
                      value={arkadeReceiveAddress}
                      onChange={(e) => setArkadeReceiveAddress(e.target.value)}
                      style={styles.input}
                    />
                    <label style={styles.swapLabel}>USDT to swap (Polygon)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount in USDT"
                      value={evmToArkadeAmount}
                      onChange={(e) => setEvmToArkadeAmount(e.target.value)}
                      style={styles.input}
                    />
                    <div style={styles.swapActions}>
                      <button
                        onClick={handleCreateEvmToArkadeSwap}
                        disabled={
                          !evmToArkadeAmount ||
                          !arkadeReceiveAddress ||
                          !evmAddress ||
                          !isPolygonNetwork ||
                          isCreatingSwap ||
                          lendaswapStatus === 'loading'
                        }
                        style={styles.button}
                      >
                        {isCreatingSwap ? 'Creating...' : 'Create Swap'}
                      </button>
                    </div>
                    {lendaswapStatus === 'loading' && (
                      <p style={styles.note}>Initializing Lendaswap client…</p>
                    )}
                  </div>

                  <div style={styles.swapColumn}>
                    <h4 style={styles.swapTitle}>3. Fund & Claim</h4>
                    {evmToArkadeSwap ? (
                      <>
                        <div style={styles.swapRow}>
                          <span style={styles.swapLabel}>Status</span>
                          <span style={styles.statusPill}>
                            {swapStatusToString(evmToArkadeSwap.status)}
                          </span>
                        </div>
                        <div style={styles.swapRow}>
                          <span style={styles.swapLabel}>Send USDT</span>
                          <strong>{formatTokenAmount(evmToArkadeSwap.source_amount)}</strong>
                        </div>
                        <div style={styles.swapRow}>
                          <span style={styles.swapLabel}>Receive sats</span>
                          <strong>{formatSatsValue(evmToArkadeSwap.target_amount)}</strong>
                        </div>
                        {evmToArkadeSwap.htlc_address_evm && (
                          <div style={styles.swapDetail}>
                            <span style={styles.swapLabel}>EVM HTLC address</span>
                            <code style={styles.code}>{evmToArkadeSwap.htlc_address_evm}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(evmToArkadeSwap.htlc_address_evm);
                                alert('EVM HTLC address copied!');
                              }}
                              style={styles.buttonSmall}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                        {evmToArkadeSwap.source_token_address && (
                          <div style={styles.swapDetail}>
                            <span style={styles.swapLabel}>USDT contract</span>
                            <code style={styles.code}>{evmToArkadeSwap.source_token_address}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(evmToArkadeSwap.source_token_address);
                                alert('Token contract copied!');
                              }}
                              style={styles.buttonSmall}
                            >
                              Copy
                            </button>
                          </div>
                        )}
                        <div style={styles.swapActions}>
                          <button
                            onClick={handleRefreshEvmToArkadeSwap}
                            disabled={isRefreshingEvmSwap}
                            style={styles.buttonSecondary}
                          >
                            {isRefreshingEvmSwap ? 'Refreshing...' : 'Refresh'}
                          </button>
                          <button
                            onClick={handleClaimEvmToArkadeSwap}
                            disabled={isClaimingEvmSwap}
                            style={styles.button}
                          >
                            {isClaimingEvmSwap ? 'Claiming...' : 'Claim to Arkade'}
                          </button>
                          <button
                            onClick={handleResetEvmToArkadeSwap}
                            style={styles.buttonSecondary}
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={styles.note}>
                        Create a swap to get the EVM HTLC address you need to fund.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            {lendaswapError && <div style={styles.errorInline}>{lendaswapError}</div>}
          </>
        )}
      </div>

      {/* VTXOs */}
      {balance && balance.vtxoList.length > 0 && (
        <div style={styles.section}>
          <h3>VTXOs ({balance.vtxoList.length})</h3>
          <div style={styles.vtxoList}>
            {balance.vtxoList.map((vtxo) => (
              <div key={vtxo.id} style={styles.vtxoCard}>
                <div>
                  <strong>{formatSats(vtxo.amount)}</strong>
                  <span style={styles.statusBadge}>{vtxo.status}</span>
                </div>
                <div style={styles.vtxoId}>
                  {vtxo.id.substring(0, 16)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Inline styles for simplicity
const styles = {
  dashboard: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  networkBadge: {
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  section: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '12px',
  },
  swapToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  swapToggleButton: {
    padding: '8px 14px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  swapToggleActive: {
    padding: '8px 14px',
    backgroundColor: '#111827',
    color: '#fff',
    border: '1px solid #111827',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  badge: {
    padding: '4px 10px',
    backgroundColor: '#111827',
    color: '#fff',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  note: {
    margin: 0,
    color: '#666',
    fontSize: '13px',
    lineHeight: 1.4,
  },
  swapPanel: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  swapColumn: {
    backgroundColor: '#f8f9fb',
    border: '1px solid #e3e8ef',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  swapTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
  },
  swapRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  swapLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 600,
  },
  swapActions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  statusGood: {
    padding: '4px 10px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusWarn: {
    padding: '4px 10px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusPill: {
    padding: '4px 10px',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  buttonSecondary: {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonSmall: {
    padding: '6px 10px',
    backgroundColor: '#eef2ff',
    color: '#3730a3',
    border: '1px solid #c7d2fe',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  quoteCard: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    display: 'grid',
    gap: '8px',
  },
  quoteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  swapDetail: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
  },
  errorInline: {
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#fee',
    color: '#b91c1c',
    borderRadius: '8px',
    fontSize: '13px',
  },
  infoGrid: {
    display: 'grid',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  code: {
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '12px',
    wordBreak: 'break-all' as const,
    fontFamily: 'monospace',
  },
  balanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  balanceCard: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  balanceLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  balanceValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#000',
  },
  onboardSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  invoiceResult: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  vtxoList: {
    display: 'grid',
    gap: '8px',
  },
  vtxoCard: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
  },
  vtxoId: {
    fontSize: '12px',
    color: '#666',
    fontFamily: 'monospace',
  },
};
