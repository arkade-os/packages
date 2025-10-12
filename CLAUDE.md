# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a MetaMask Snap that brings Bitcoin Layer 2 functionality to the browser via the Ark protocol. The snap enables instant off-chain Bitcoin transactions (VTXOs), Lightning Network payments via submarine swaps, and self-custodial Bitcoin management.

**Key Technologies:**
- MetaMask Snaps SDK v6.0 - Browser extension framework
- Arkade SDK v0.3.1-alpha.3 - Bitcoin Layer 2 wallet functionality
- Arkade Boltz Swap v0.2.1-alpha.3 - Lightning Network integration via submarine/reverse swaps
- React 18 + Vite - Frontend dapp
- pnpm workspace - Monorepo management

## Development Commands

### Initial Setup
```bash
pnpm install
```

### Development
```bash
# Start both snap and site in watch mode (recommended for development)
pnpm start
# Snap serves at http://localhost:8080
# Site serves at http://localhost:8000

# Start snap only
cd packages/snap && pnpm start

# Start site only
cd packages/site && pnpm start
```

### Building
```bash
# Build all packages
pnpm build

# Build snap only
cd packages/snap && pnpm build

# Build site only
cd packages/site && pnpm build
```

### Testing & Linting
```bash
# Run tests in all packages
pnpm test

# Run snap tests only
cd packages/snap && pnpm test

# Lint all packages
pnpm lint

# Auto-fix lint issues
pnpm lint:fix
```

### Snap-Specific Commands
```bash
cd packages/snap

# Serve the built snap (without watch mode)
pnpm serve

# Stop the snap server (kills process on port 8080)
pnpm stop

# Clean build artifacts
pnpm clean

# Delete build artifacts (alias for clean)
pnpm delete

# Rebuild from scratch (clean + build + serve)
pnpm rebuild
```

### Site-Specific Commands
```bash
cd packages/site

# Development server
pnpm dev

# Preview production build locally
pnpm preview
```

## Architecture

### Overview - Simplified Provider Pattern

This snap uses a **minimal signing service** approach where the Snap only handles Bitcoin key management and signing, while all wallet logic (balance, transactions, Lightning) runs in the frontend using the Arkade SDK.

```
┌─────────────────────────────────────────┐
│  Frontend (Dapp)                        │
│  ┌────────────────────────────────┐    │
│  │ Arkade SDK Wallet              │    │
│  │  + MetaMaskSnapIdentity        │    │
│  │  - Balance queries             │    │
│  │  - Transaction history         │    │
│  │  - Lightning operations        │    │
│  │  - VTXO management             │    │
│  └──────────┬─────────────────────┘    │
│             │                            │
│             │ (signing requests only)    │
│             ▼                            │
│  ┌────────────────────────────────┐    │
│  │ MetaMask Snap (~97 lines)      │    │
│  │  - bitcoin_getAccounts()       │    │
│  │  - bitcoin_signPsbt()          │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ **Simpler** - Snap reduced from ~600 to ~97 lines
- ✅ **Faster** - No RPC overhead for data queries
- ✅ **More secure** - Minimal attack surface
- ✅ **More flexible** - Update wallet logic without snap rebuild

### Monorepo Structure
```
packages/
├── snap/          # MetaMask Snap (Minimal signing service)
│   ├── src/
│   │   ├── index.ts      # RPC handlers (only 2 methods!)
│   │   └── wallet.ts     # Bitcoin key derivation & PSBT signing
│   └── snap.manifest.json
└── site/          # React frontend (Runs Arkade SDK)
    └── src/
        ├── components/
        │   └── MetaMaskProvider.tsx  # Manages Arkade Wallet instance
        ├── utils/
        │   └── MetaMaskSnapIdentity.ts  # Identity provider for Arkade SDK
        └── App.tsx
```

### Snap Architecture (packages/snap)

**Entry Point: [index.ts](packages/snap/src/index.ts:1-27)**
- Exports `onRpcRequest` handler with only **2 RPC methods**:
  - `bitcoin_getAccounts` - Get Bitcoin taproot address and public keys
  - `bitcoin_signPsbt` - Sign a PSBT with the snap's key
- No dialogs, no state management, just pure signing functionality

**Bitcoin Signing: [wallet.ts](packages/snap/src/wallet.ts:1-97)**
- `getBitcoinAccounts()` - Derives Bitcoin keys from MetaMask's entropy
  - Uses `snap_getEntropy` with salt `'bitcoin-arkade-snap'` for deterministic key derivation
  - Returns taproot address, full public key, and x-only public key
- `signPsbt()` - Signs PSBTs using the derived key
  - Accepts base64-encoded PSBT and input indexes to sign
  - Returns signed PSBT

**Permission Requirements (snap.manifest.json):**
- `snap_getEntropy` - Derive deterministic Bitcoin keys
- `endowment:rpc` - Accept RPC calls from dapps
- `endowment:network-access` - (Not needed in minimal snap, but kept for future use)

**No State Storage:**
- Snap is completely stateless
- Keys derived on-demand from MetaMask entropy
- No `snap_manageState` or `snap_dialog` permissions needed

### Frontend Architecture (packages/site)

**Communication Pattern:**
1. React components use `useMetaMask()` hook
2. Hook manages **Arkade Wallet instance** that runs in the browser
3. Wallet uses **MetaMaskSnapIdentity** provider for signing
4. Identity provider calls snap only when signatures are needed
5. All balance/transaction queries happen client-side via Arkade SDK

**MetaMaskProvider Context ([MetaMaskProvider.tsx](packages/site/src/components/MetaMaskProvider.tsx:1-380)):**
- Creates and manages `Wallet` instance from `@arkade-os/sdk`
- Creates `MetaMaskSnapIdentity` provider that implements signing interface
- Provides React hooks for wallet operations:
  - `connectSnap()` - Install snap + create Arkade wallet
  - `getBalance()` - Query balance from Arkade SDK
  - `sendBitcoin()` - Send via Arkade SDK (triggers snap signing)
  - `getTransactionHistory()` - Fetch from Arkade SDK
  - `payLightningInvoice()` - Pay via ArkadeLightning
  - `createLightningInvoice()` - Receive via ArkadeLightning

**MetaMaskSnapIdentity Provider ([MetaMaskSnapIdentity.ts](packages/site/src/utils/MetaMaskSnapIdentity.ts:1-169)):**
- Implements Arkade SDK's `Identity` interface
- Translates Arkade SDK signing requests to snap RPC calls
- Handles PSBT encoding/decoding (Transaction ↔ base64)
- Manages connection state and reconnection logic

**State Flow:**
```
User Action → Component → useMetaMask() → Arkade Wallet → MetaMaskSnapIdentity → Snap (signing only)
                                        ↓
                                   Arkade Server / Esplora
```

## Arkade SDK Integration

### Network Configuration
Networks supported: `bitcoin`, `testnet`, `mutinynet`, `regtest`

Each network requires:
- `esploraUrl` - Bitcoin blockchain explorer API
- `arkUrl` - Ark protocol server
- `boltzUrl` - Boltz swap API for Lightning (optional, only for Lightning features)

Configuration in [wallet.ts:16-35](packages/snap/src/wallet.ts#L16-L35)

### Wallet Lifecycle
1. **Creation**: `SingleKey.fromRandomBytes()` → Store hex key → Create `Wallet` instance
2. **Initialization**: Retrieve stored key → `SingleKey.fromHex(key)` → Recreate `Wallet`
3. **Usage**: All operations go through `Wallet` instance methods
4. **Reset**: Clear MetaMask state (user must backup recovery phrase first)

### VTXOs (Virtual Transaction Outputs)
- Off-chain Bitcoin transactions that settle instantly
- Tracked via `wallet.getVtxos()` method
- States: `pending`, `preconfirmed`, `settled`
- Included in balance as `offchain` amount
- Can be used to send Bitcoin or pay Lightning invoices

### Lightning Integration
Uses Boltz swap protocol:
- **Submarine Swap** (pay invoice): Ark VTXO → Lightning payment
- **Reverse Swap** (receive): Lightning payment → Ark VTXO
- Managed by `ArkadeLightning` class from `@arkade-os/boltz-swap`
- Auto-claims reverse swaps via `waitAndClaim()` background process

## RPC Methods

The snap exposes only **2 minimal RPC methods** for Bitcoin signing:

### `bitcoin_getAccounts`

Get Bitcoin account information (address and public keys).

```typescript
const response = await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: { method: 'bitcoin_getAccounts' }
  }
});

// Returns:
// {
//   accounts: [{
//     address: "tb1p...",        // Bitcoin taproot address
//     publicKey: "02...",          // Full public key (33 bytes hex)
//     xOnlyPublicKey: "..."        // x-only public key (32 bytes hex)
//   }]
// }
```

### `bitcoin_signPsbt`

Sign a Partially Signed Bitcoin Transaction (PSBT).

```typescript
const response = await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: {
      method: 'bitcoin_signPsbt',
      params: {
        psbt: 'cHNidP8B...', // Base64-encoded PSBT
        inputIndexes: [0, 1]  // Indexes of inputs to sign
      }
    }
  }
});

// Returns:
// {
//   psbt: 'cHNidP8B...'  // Base64-encoded signed PSBT
// }
```

### Why Only 2 Methods?

All wallet operations (balance, transactions, Lightning) are handled by the **Arkade SDK running in the frontend** with a `MetaMaskSnapIdentity` provider. The snap is only called for signing operations.

**This approach provides:**
- ✅ Smaller snap codebase (~97 lines vs ~600 lines)
- ✅ Faster development (no snap rebuild for wallet logic changes)
- ✅ Better UX (no RPC overhead for data queries)
- ✅ More secure (minimal attack surface)
- ✅ More flexible (update Arkade SDK version without snap changes)

## Testing Requirements

**Prerequisites:**
- MetaMask Flask (developer version) installed
- Frontend running on localhost:8000
- Snap built and served on localhost:8080

**Test Flow:**
1. Build snap: `cd packages/snap && pnpm build`
2. Start development servers: `pnpm start` (from root)
   - Snap serves at http://localhost:8080
   - Site serves at http://localhost:8000
3. Open http://localhost:8000 in browser
4. Click "Connect Snap" - installs snap + creates Arkade wallet
5. Fund wallet via boarding address (on-chain deposit to Signet testnet)
6. Wait for confirmation, funds appear as VTXOs in balance
7. Test send/receive and Lightning operations

**Important Testing Notes:**
- Uses **Signet testnet** by default (configured in MetaMaskProvider.tsx)
- First deposit requires on-chain confirmation (boarding)
- Subsequent transfers use VTXOs (instant off-chain)
- Lightning integration via Boltz (Signet: https://api.boltz.exchange)
- Get testnet coins from [Signet Faucet](https://signetfaucet.com/)

**To Stop Servers:**
```bash
# Stop snap server
cd packages/snap && pnpm stop

# Or kill all on port 8080
lsof -ti:8080 | xargs kill -9
```

## Common Development Patterns

### Adding a New RPC Method
1. Add case to switch statement in [index.ts](packages/snap/src/index.ts#L17)
2. Create handler function (e.g., `handleMethodName`)
3. Implement logic in [wallet.ts](packages/snap/src/wallet.ts)
4. Export function from wallet.ts
5. Add TypeScript types for params/response
6. Add method to MetaMaskProvider context
7. Update MetaMaskProvider interface
8. Use in React components via `useMetaMask()` hook

### Working with State
```typescript
// Get state
const state = await snap.request({
  method: 'snap_manageState',
  params: { operation: 'get' }
});

// Update state (merges with existing)
await snap.request({
  method: 'snap_manageState',
  params: {
    operation: 'update',
    newState: { ...state, newKey: value }
  }
});
```

### Showing User Dialogs
```typescript
const confirmed = await snap.request({
  method: 'snap_dialog',
  params: {
    type: 'confirmation',  // or 'alert'
    content: panel([
      heading('Title'),
      text('Description'),
      divider(),
      copyable('hash or address')
    ])
  }
});
```

## Known Limitations

- Wallet import not yet implemented ([index.ts:178](packages/snap/src/index.ts#L178))
- SDK type mismatch between `@arkade-os/sdk` (0.3.1-alpha.3) and `@arkade-os/boltz-swap` (uses 0.2.3)
- Individual UTXO details not exposed by SDK ([wallet.ts:295](packages/snap/src/wallet.ts#L295))
- Must use MetaMask Flask, not regular MetaMask
- Snap must be local during development (production requires npm publish)

## Important Notes

- Private keys are NEVER exposed to the dapp - only the snap can access them
- All transactions require explicit user confirmation via MetaMask dialogs
- Snap runs in sandboxed environment isolated from web pages
- Network selection happens at wallet creation time (cannot be changed without reset)
- VTXOs expire after a certain time - check `expiry` field
- Lightning swaps have maximum amount limits set by Boltz
