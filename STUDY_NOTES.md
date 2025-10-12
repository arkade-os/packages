# Arkade SDK & Boltz Swap - Study Notes

## Overview

This document provides a comprehensive study of the Arkade TypeScript SDK and Boltz swap integration, including fixes applied to the MetaMask Snap implementation.

---

## 1. Arkade SDK Core Concepts

### What is Arkade?

**Arkade** is a Bitcoin Layer 2 protocol that enables instant, off-chain Bitcoin transactions using the **Ark protocol**. It provides:

- **Instant settlements**: No waiting for blockchain confirmations
- **Low fees**: Off-chain transactions are much cheaper
- **Bitcoin-native**: Built on top of Bitcoin, not a separate blockchain
- **Lightning integration**: Seamless interoperability with Lightning Network
- **Self-custody**: Users maintain control of their private keys

### Key Components

#### 1. **Wallet**
The main interface for Bitcoin operations with Ark protocol support.

```typescript
import { SingleKey, Wallet } from '@arkade-os/sdk';

// Create identity (private key)
const identity = SingleKey.fromRandomBytes();

// Initialize wallet
const wallet = await Wallet.create({
  identity,
  esploraUrl: 'https://blockstream.info/testnet/api',
  arkServerUrl: 'https://testnet.arkade.services',
});
```

**Key Methods:**
- `getAddress()` - Get Ark address for receiving off-chain payments
- `getBoardingAddress()` - Get on-chain address for receiving Bitcoin
- `getBalance()` - Get detailed balance breakdown
- `sendBitcoin({ address, amount })` - Send Bitcoin (on-chain or off-chain)
- `getVtxos()` - Get virtual transaction outputs
- `getBoardingUtxos()` - Get on-chain UTXOs
- `getTransactionHistory()` - Get transaction history

#### 2. **VTXOs (Virtual Transaction Outputs)**

VTXOs are **off-chain Bitcoin representations** in the Ark protocol. They work like UTXOs but exist off-chain for instant transfers.

**Key Characteristics:**
- **Instant transfers**: No blockchain confirmations needed
- **Batch settlements**: Multiple VTXOs can be settled together
- **Expiration**: VTXOs have an expiry time (batch expiry)
- **Renewal**: Can be renewed before expiry to maintain liquidity
- **Recovery**: Expired/swept VTXOs can be recovered

**VTXO Lifecycle:**
```
On-chain BTC → Boarding → VTXOs (off-chain) → Ark Transfers → Offboarding → On-chain BTC
```

#### 3. **Balance Structure**

The SDK returns detailed balance information:

```typescript
interface Balance {
  total: bigint;                    // Total balance (boarding + available)
  boarding: {
    total: bigint;                  // Total on-chain balance
    confirmed: bigint;              // Confirmed on-chain balance
    unconfirmed: bigint;           // Unconfirmed on-chain balance
  };
  available: bigint;                // Available off-chain balance
  settled: bigint;                  // Settled off-chain balance
  preconfirmed: bigint;            // Preconfirmed off-chain balance
  recoverable: bigint;             // Recoverable balance from swept VTXOs
}
```

**Balance Types Explained:**
- **boarding.total**: Bitcoin in your on-chain wallet (not yet in Ark)
- **available**: Off-chain Bitcoin ready to spend instantly
- **settled**: Off-chain Bitcoin fully settled in Ark rounds
- **preconfirmed**: Off-chain Bitcoin pending settlement
- **recoverable**: Bitcoin from expired/swept VTXOs that can be recovered

#### 4. **Onboarding & Offboarding**

**Onboarding** (On-chain → Off-chain):
```typescript
import { Ramps } from '@arkade-os/sdk';
const txid = await new Ramps(wallet).onboard();
```
Converts on-chain BTC to VTXOs for instant off-chain transfers.

**Offboarding** (Off-chain → On-chain):
```typescript
const exitTxid = await new Ramps(wallet).offboard(onchainAddress);
```
Collaborative exit from Ark back to Bitcoin blockchain.

#### 5. **VTXO Management**

**Renewal** (prevent expiration):
```typescript
import { VtxoManager } from '@arkade-os/sdk';

const manager = new VtxoManager(wallet, {
  enabled: true,
  thresholdPercentage: 10  // Alert when 10% of lifetime remains
});

const expiringVtxos = await manager.getExpiringVtxos();
const txid = await manager.renewVtxos();
```

**Recovery** (reclaim swept VTXOs):
```typescript
const balance = await manager.getRecoverableBalance();
if (balance.recoverable > 0n) {
  const txid = await manager.recoverVtxos();
}
```

#### 6. **Unilateral Exit**

For non-cooperative exits when the Ark server is unavailable:

```typescript
import { Unroll, OnchainWallet, SingleKey } from '@arkade-os/sdk';

// Step 1: Create onchain wallet for fee payment
const onchainIdentity = SingleKey.fromHex('your_private_key');
const onchainWallet = await OnchainWallet.create(onchainIdentity, 'regtest');

// Step 2: Unroll VTXO transaction chain
const vtxo = { txid: 'vtxo_txid', vout: 0 };
const session = await Unroll.Session.create(
  vtxo,
  onchainWallet,
  onchainWallet.provider,
  wallet.indexerProvider
);

for await (const step of session) {
  // Process unrolling steps (WAIT, UNROLL, DONE)
}

// Step 3: Complete exit after timelock expires
await Unroll.completeUnroll(
  wallet,
  [vtxo.txid],
  onchainWallet.address
);
```

---

## 2. Boltz Swap Integration

### What is Boltz?

**Boltz** provides **submarine swap** services that enable trustless exchanges between Bitcoin (on-chain), Lightning Network, and Layer 2 protocols like Ark.

### Swap Types

#### 1. **Submarine Swap** (Arkade → Lightning)
Sending from Arkade wallet to a Lightning invoice.

```typescript
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';

const swapProvider = new BoltzSwapProvider({
  apiUrl: 'https://api.boltz.mutinynet.arkade.sh',
  network: 'mutinynet',
});

const arkadeLightning = new ArkadeLightning({
  wallet,
  swapProvider,
});

// Pay Lightning invoice
const result = await arkadeLightning.sendLightningPayment({
  invoice: 'lnbc500u1pj...',
  maxFeeSats: 1000,
});
```

**How it works:**
1. User provides Lightning invoice
2. Boltz locks funds in HTLC (Hash Time-Locked Contract)
3. Boltz pays Lightning invoice
4. User claims with preimage
5. Boltz gets paid from Ark VTXOs

#### 2. **Reverse Swap** (Lightning → Arkade)
Receiving Lightning payments into Arkade wallet.

```typescript
// Create invoice
const result = await arkadeLightning.createLightningInvoice({
  amount: 50000,
  description: 'Payment to my Arkade wallet',
});

console.log('Invoice:', result.invoice);

// Wait for payment and auto-claim
await arkadeLightning.waitAndClaim(result.pendingSwap);
```

**How it works:**
1. Boltz creates Lightning invoice
2. Payer pays the invoice
3. Boltz creates on-chain/Ark transaction
4. User claims with preimage revealed by Boltz
5. Funds appear in Arkade wallet as VTXOs

### Checking Limits and Fees

```typescript
// Check swap amount limits
const limits = await arkadeLightning.getLimits();
console.log('Min:', limits.min, 'Max:', limits.max);

// Check swap fees
const fees = await arkadeLightning.getFees();

const submarineSwapFee = (satoshis: number) => {
  const { percentage, minerFees } = fees.submarine;
  return Math.ceil((satoshis * percentage) / 100 + minerFees);
};

const reverseSwapFee = (satoshis: number) => {
  const { percentage, minerFees } = fees.reverse;
  return Math.ceil((satoshis * percentage) / 100 + minerFees.claim + minerFees.lockup);
};
```

### Invoice Handling

```typescript
import { decodeInvoice } from '@arkade-os/boltz-swap';

const decoded = decodeInvoice('lnbc500u1pj...');
console.log('Amount:', decoded.amountSats);
console.log('Description:', decoded.description);
console.log('Payment Hash:', decoded.paymentHash);
```

### Swap Status & History

```typescript
// Check specific swap status
const status = await arkadeLightning.getSwapStatus('swap_id');

// Get pending swaps
const pendingPayments = await arkadeLightning.getPendingSubmarineSwaps();
const pendingReceives = await arkadeLightning.getPendingReverseSwaps();

// Get complete swap history
const history = await arkadeLightning.getSwapHistory();
```

### Error Handling

```typescript
import {
  SwapError,
  SchemaError,
  NetworkError,
  SwapExpiredError,
  InvoiceExpiredError,
  InvoiceFailedToPayError,
  InsufficientFundsError,
  TransactionFailedError,
} from '@arkade-os/boltz-swap';

try {
  await arkadeLightning.sendLightningPayment({ invoice });
} catch (error) {
  if (error instanceof InvoiceExpiredError) {
    console.error('Invoice expired - request new one');
  } else if (error instanceof InsufficientFundsError) {
    console.error('Not enough funds');
  } else if (error instanceof NetworkError) {
    console.error('Network issue - retry later');
  }

  // Attempt refund if possible
  if (error.isRefundable && error.pendingSwap) {
    const refund = await arkadeLightning.refundVHTLC(error.pendingSwap);
    console.log('Refunded:', refund.txid);
  }
}
```

---

## 3. Storage Adapters

The SDK provides multiple storage adapters for different environments:

### In-Memory (Default)
```typescript
import { InMemoryStorageAdapter } from '@arkade-os/sdk';
const storage = new InMemoryStorageAdapter(); // Data lost on restart
```

### Browser/PWA
```typescript
import { LocalStorageAdapter } from '@arkade-os/sdk/adapters/localStorage';
const storage = new LocalStorageAdapter();
```

### Browser/Service Worker (Advanced)
```typescript
import { IndexedDBStorageAdapter } from '@arkade-os/sdk/adapters/indexedDB';
const storage = new IndexedDBStorageAdapter('my-app', 1);
```

### React Native
```typescript
import { AsyncStorageAdapter } from '@arkade-os/sdk/adapters/asyncStorage';
const storage = new AsyncStorageAdapter();
```

### Node.js
```typescript
import { FileSystemStorageAdapter } from '@arkade-os/sdk/adapters/fileSystem';
const storage = new FileSystemStorageAdapter('./wallet-data');
```

---

## 4. Service Worker Integration

**Ultra-simplified setup** with automatic registration:

```typescript
import { ServiceWorkerWallet, SingleKey } from '@arkade-os/sdk';

const identity = SingleKey.fromHex('your_private_key_hex');

const wallet = await ServiceWorkerWallet.setup({
  serviceWorkerPath: '/service-worker.js',
  arkServerUrl: 'https://mutinynet.arkade.sh',
  identity,
});

// Ready to use immediately
const address = await wallet.getAddress();
const balance = await wallet.getBalance();
```

**service-worker.js:**
```typescript
import { Worker } from '@arkade-os/sdk';
new Worker().start();
```

---

## 5. Expo/React Native Integration

For React Native environments with EventSource limitations:

```typescript
import { Wallet, SingleKey } from '@arkade-os/sdk';
import { ExpoArkProvider, ExpoIndexerProvider } from '@arkade-os/sdk/adapters/expo';

const identity = SingleKey.fromHex('your_private_key_hex');

const wallet = await Wallet.create({
  identity,
  esploraUrl: 'https://mutinynet.com/api',
  arkProvider: new ExpoArkProvider('https://mutinynet.arkade.sh'),
  indexerProvider: new ExpoIndexerProvider('https://mutinynet.arkade.sh'),
});
```

**Crypto Polyfill Requirement:**
```typescript
// App entry point - MUST be first import
import * as Crypto from 'expo-crypto';
if (!global.crypto) global.crypto = {} as any;
global.crypto.getRandomValues = Crypto.getRandomValues;
```

---

## 6. Repository Pattern

Access low-level data management:

```typescript
// VTXO management (automatically cached)
const addr = await wallet.getAddress();
const vtxos = await wallet.walletRepository.getVtxos(addr);
await wallet.walletRepository.saveVtxos(addr, vtxos);

// Contract data for SDK integrations
await wallet.contractRepository.setContractData('my-contract', 'status', 'active');
const status = await wallet.contractRepository.getContractData('my-contract', 'status');

// Collection management for related data
await wallet.contractRepository.saveToContractCollection(
  'swaps',
  { id: 'swap-1', amount: 50000, type: 'reverse' },
  'id'
);
const swaps = await wallet.contractRepository.getContractCollection('swaps');
```

---

## 7. Fixes Applied to MetaMask Snap

### Issue 1: Build Dependencies
**Problem**: Missing `prettier` plugins causing build failure.

**Fix**: Upgraded `prettier` to v3 which includes necessary plugins:
```bash
pnpm add -D prettier@^3.0.0
```

### Issue 2: Missing Snap Configuration
**Problem**: No `snap.config.ts` file found.

**Fix**: Created [snap.config.ts](packages/snap/snap.config.ts) with proper polyfills:
```typescript
const config: SnapConfig = {
  bundler: 'webpack',
  input: resolve(__dirname, 'src/index.ts'),
  polyfills: {
    buffer: true,
    crypto: true,
    stream: true,
  },
  stats: {
    builtIns: {
      ignore: ['fs'],
    },
  },
};
```

### Issue 3: Incorrect Arkade SDK API Usage
**Problem**: Using wrong method names from outdated SDK version.

**Fixes in [wallet.ts](packages/snap/src/wallet.ts):**

| Incorrect API | Correct API |
|--------------|-------------|
| `new Wallet({ ... })` | `await Wallet.create({ ... })` |
| `arkUrl` parameter | `arkServerUrl` parameter |
| `wallet.getArkAddress()` | `wallet.getAddress()` |
| `SingleKey.generate()` | `SingleKey.fromRandomBytes()` |
| `wallet.send(to, amount)` | `wallet.sendBitcoin({ address: to, amount })` |
| `balance.boardingTotal` | `balance.boarding.total` |
| `balance.offchainAvailable` | `balance.available` |
| `wallet.getVTXOs()` | `wallet.getVtxos()` |

### Issue 4: Lightning Payment Not Implemented
**Problem**: Lightning payment was stubbed out with TODO.

**Fix**: Implemented full Lightning integration in [wallet.ts](packages/snap/src/wallet.ts:313-384):

1. **Created `initLightning()` helper**:
   - Initializes `BoltzSwapProvider`
   - Creates `ArkadeLightning` instance with wallet

2. **Implemented `payLightningInvoice()`**:
   - Uses submarine swap to pay Lightning invoices
   - Returns txid, preimage, and amount

3. **Implemented `createLightningInvoice()`**:
   - Uses reverse swap to receive Lightning payments
   - Automatically claims payment in background
   - Returns invoice, payment hash, amount, and expiry

4. **Updated RPC handlers** in [index.ts](packages/snap/src/index.ts):
   - Enhanced `handlePayLightningInvoice()` with Boltz integration
   - Added new `handleCreateLightningInvoice()` handler
   - Added new RPC method `arkade_createLightningInvoice`

---

## 8. MetaMask Snap API Methods

The snap now exposes these JSON-RPC methods:

### Wallet Management
- `arkade_getWallet` - Get current wallet info
- `arkade_createWallet` - Create new Arkade wallet
- `arkade_resetWallet` - Reset/clear wallet data (with confirmation)
- `arkade_importWallet` - Import existing wallet (TODO)

### Balance & Transactions
- `arkade_getBalance` - Get detailed balance breakdown
- `arkade_getTransactionHistory` - Get transaction history

### Sending Bitcoin
- `arkade_send` - Send Bitcoin via Ark protocol
  ```javascript
  params: { to: string, amount: number, asset?: 'btc' }
  ```

### Lightning Network
- `arkade_payLightningInvoice` - Pay Lightning invoice
  ```javascript
  params: { invoice: string, maxFeeSats?: number }
  ```

- `arkade_createLightningInvoice` - Create Lightning invoice
  ```javascript
  params: { amount: number, description?: string }
  ```

---

## 9. Key Takeaways

### Architecture Benefits
1. **Instant Settlements**: Off-chain VTXOs enable instant Bitcoin transfers
2. **Lightning Interop**: Seamless integration via Boltz submarine swaps
3. **Low Fees**: Off-chain operations are significantly cheaper
4. **Self-Custody**: Users maintain full control of private keys
5. **Bitcoin-Native**: Built on Bitcoin, not a separate chain

### Best Practices
1. **Monitor VTXOs**: Use `VtxoManager` to prevent expiration
2. **Handle Errors**: Implement proper error handling with specific error types
3. **Fee Management**: Check limits and fees before swaps
4. **Storage**: Choose appropriate storage adapter for your environment
5. **Recovery**: Always check recoverable balance periodically

### Development Workflow
1. **Local Testing**: Use `nigiri` for local Bitcoin regtest with Ark
2. **Integration Tests**: Test with Mutinynet for public testnet
3. **Build Process**: Use MetaMask Snaps CLI for snap development
4. **Documentation**: Reference [TypeScript docs](https://arkade-os.github.io/ts-sdk/)

---

## 10. Resources

- **Arkade SDK Docs**: https://arkade-os.github.io/ts-sdk/
- **Boltz Swap Docs**: https://github.com/arkade-os/boltz-swap
- **DeepWiki**: https://deepwiki.com/ark-ts-sdk
- **MetaMask Snaps**: https://docs.metamask.io/snaps/

---

## Build Status

✅ **All issues fixed!**
- Prettier dependencies resolved
- Snap configuration created
- SDK API calls corrected
- Lightning integration fully implemented
- Build succeeds with no errors

```bash
pnpm build  # Build all packages
pnpm start  # Start development server
```
