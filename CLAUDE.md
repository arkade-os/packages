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
│  │ MetaMask Snap                  │    │
│  │  - arkade_getPublicKey()       │    │
│  │  - arkade_getAddress()         │    │
│  │  - arkade_signPsbt()           │    │
│  │  - arkade_exportPrivateKey()   │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ **Simpler** - Minimal codebase focused on key operations
- ✅ **Faster** - No RPC overhead for data queries
- ✅ **More secure** - Minimal attack surface, keys never leave snap
- ✅ **More flexible** - Update wallet logic without snap rebuild

### Monorepo Structure
```
packages/
├── snap/          # MetaMask Snap (Minimal signing service)
│   ├── src/
│   │   ├── index.ts      # RPC handlers (4 methods)
│   │   ├── wallet.ts     # Bitcoin key derivation & PSBT signing
│   │   ├── utils.ts      # Parameter validation functions
│   │   └── types.ts      # TypeScript type definitions
│   └── snap.manifest.json
└── site/          # React frontend (Runs Arkade SDK)
    └── src/
        ├── components/
        │   ├── MetaMaskProvider.tsx  # Manages Arkade Wallet instance
        │   ├── Dashboard.tsx
        │   ├── SendModal.tsx
        │   ├── LightningModal.tsx
        │   └── ReceiveModal.tsx
        ├── utils/
        │   └── MetaMaskSnapIdentity.ts  # Identity provider for Arkade SDK
        └── App.tsx
```

### Snap Architecture (packages/snap)

**Entry Point: [index.ts](packages/snap/src/index.ts:1-54)**
- Exports `onRpcRequest` handler with **4 RPC methods**:
  - `arkade_getPublicKey` - Get compressed and x-only public keys
  - `arkade_getAddress` - Get Ark address for network/server config
  - `arkade_signPsbt` - Sign a PSBT with the snap's key
  - `arkade_exportPrivateKey` - Export private key (with user confirmation dialog)

**Bitcoin Key Management: [wallet.ts](packages/snap/src/wallet.ts:1-234)**
- `getPublicKey()` - Derives Bitcoin keys from MetaMask's entropy
  - Uses `snap_getEntropy` with salt `'bitcoin-arkade-snap'` for deterministic key derivation
  - Returns compressed public key and x-only public key
- `getAddress()` - Builds Ark address using server parameters
  - Accepts network name, server signer pubkey, and unilateral exit delay
  - Creates DefaultVtxo script with taproot output key
  - Returns bech32m-encoded Ark address
- `signPsbt()` - Signs PSBTs using the derived key
  - Accepts base64-encoded PSBT and input indexes to sign
  - Returns signed PSBT
- `exportPrivateKey()` - Exports private key after user confirmation
  - Shows critical warning dialog to user
  - Returns private key in hex and nsec (Nostr) formats

**Permission Requirements (snap.manifest.json):**
- `snap_getEntropy` - Derive deterministic Bitcoin keys
- `snap_dialog` - Show user confirmation dialogs (for private key export)
- `endowment:rpc` - Accept RPC calls from dapps

**Key Security Features:**
- Keys derived on-demand from MetaMask entropy
- Private key export requires explicit user confirmation via dialog
- All signing operations happen within the snap sandbox

### Frontend Architecture (packages/site)

**Communication Pattern:**
1. React components use `useMetaMask()` hook
2. Hook manages **Arkade Wallet instance** that runs in the browser
3. Wallet uses **MetaMaskSnapIdentity** provider for signing
4. Identity provider calls snap only when signatures are needed
5. All balance/transaction queries happen client-side via Arkade SDK

**MetaMaskProvider Context ([MetaMaskProvider.tsx](packages/site/src/components/MetaMaskProvider.tsx:1-674)):**
- Creates and manages `Wallet` instance from `@arkade-os/sdk`
- Creates `MetaMaskSnapIdentity` provider that implements signing interface
- Provides React hooks for wallet operations:
  - `connectSnap()` - Install snap + create Arkade wallet
  - `getBalance()` - Query balance from Arkade SDK
  - `sendBitcoin()` - Send via Arkade SDK (triggers snap signing)
  - `getTransactionHistory()` - Fetch from Arkade SDK
  - `payLightningInvoice()` - Pay Lightning invoice via ArkadeLightning
  - `createLightningInvoice()` - Create Lightning invoice for receiving
  - `onboardFunds()` - Onboard funds from boarding address to VTXOs
  - `switchNetwork()` - Switch between bitcoin and signet networks

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
Networks supported: `bitcoin`, `signet`

Each network requires:
- `esploraUrl` - Bitcoin blockchain explorer API
- `arkServerUrl` - Ark protocol server
- `boltzUrl` - Boltz swap API for Lightning (optional, only for Lightning features)

Configuration in [MetaMaskProvider.tsx:21-36](packages/site/src/components/MetaMaskProvider.tsx#L21-L36)

### Wallet Lifecycle
1. **Connection**: User clicks "Connect Snap" → MetaMask installs snap
2. **Key Derivation**: Snap derives keys from `snap_getEntropy` (deterministic, no storage needed)
3. **Wallet Creation**: Frontend creates `Wallet` instance with `MetaMaskSnapIdentity` provider
4. **Usage**: All operations go through `Wallet` instance methods in frontend
5. **Network Switch**: `switchNetwork()` recreates wallet with new network config
6. **Reset**: `resetWallet()` clears frontend state (keys remain in MetaMask entropy)

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

The snap exposes **4 focused RPC methods** for Bitcoin key management and signing:

### `arkade_getPublicKey`

Get the snap's public keys (compressed and x-only formats).

```typescript
const response = await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: { method: 'arkade_getPublicKey' }
  }
});

// Returns:
// {
//   compressedPublicKey: "02...",  // Compressed public key (33 bytes hex)
//   xOnlyPublicKey: "..."           // x-only public key (32 bytes hex)
// }
```

### `arkade_getAddress`

Get the Ark address for the current network and server configuration.

```typescript
const response = await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: {
      method: 'arkade_getAddress',
      params: {
        network: 'bitcoin',              // 'bitcoin' | 'testnet' | 'signet' | 'mutinynet' | 'regtest'
        signerPubkey: '...',             // Server's x-only public key (64 hex chars)
        unilateralExitDelay: '512'       // CSV timelock value from server
      }
    }
  }
});

// Returns:
// {
//   address: "ark1..."  // Ark address (bech32m encoded)
// }
```

### `arkade_signPsbt`

Sign a Partially Signed Bitcoin Transaction (PSBT).

```typescript
const response = await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: {
      method: 'arkade_signPsbt',
      params: {
        psbt: 'cHNidP8B...',       // Base64-encoded PSBT
        inputIndexes: [0, 1]        // Indexes of inputs to sign
      }
    }
  }
});

// Returns:
// {
//   psbt: 'cHNidP8B...'  // Base64-encoded signed PSBT
// }
```

### `arkade_exportPrivateKey`

Export the private key (requires user confirmation).

**⚠️ WARNING**: This method shows a confirmation dialog and exposes the private key. Only use for backup/migration purposes.

```typescript
const response = await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: { method: 'arkade_exportPrivateKey' }
  }
});

// Returns (after user confirms):
// {
//   hex: "...",   // Private key in hexadecimal format
//   nsec: "nsec1..."  // Private key in Nostr format (bech32)
// }
```

### Why These 4 Methods?

All wallet operations (balance, transactions, Lightning) are handled by the **Arkade SDK running in the frontend** with a `MetaMaskSnapIdentity` provider. The snap only handles sensitive key operations.

**This approach provides:**
- ✅ Minimal snap codebase focused on key operations
- ✅ Faster development (no snap rebuild for wallet logic changes)
- ✅ Better UX (no RPC overhead for data queries)
- ✅ More secure (minimal attack surface, keys never leave snap)
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
- Uses **Bitcoin mainnet** by default, but can switch to Signet testnet via UI
- Network can be changed via the network selector in the dashboard
- First deposit requires on-chain confirmation (boarding)
- Subsequent transfers use VTXOs (instant off-chain)
- Lightning integration only available on Bitcoin mainnet (via Boltz)
- For Signet testing, use [Signet Faucet](https://signetfaucet.com/)

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

### Showing User Dialogs (for private key export)
```typescript
const confirmed = await snap.request({
  method: 'snap_dialog',
  params: {
    type: 'confirmation',  // or 'alert'
    content: panel([
      heading('⚠️ Export Private Key'),
      text('**WARNING**: Your private key controls all your funds!'),
      divider(),
      text('Never share your private key with anyone.')
    ])
  }
});

if (!confirmed) {
  throw new Error('User rejected operation');
}
```

### Adding a New Network
To add a new network (e.g., testnet):
1. Add network config to `NETWORK_CONFIGS` in [MetaMaskProvider.tsx:21-36](packages/site/src/components/MetaMaskProvider.tsx#L21-L36)
2. Update `SupportedNetwork` type to include the new network
3. Add network option to the network selector UI component
4. No changes needed in the snap - it's network-agnostic

## Known Limitations

- SDK type mismatch between `@arkade-os/sdk` (0.3.1-alpha.3) and `@arkade-os/boltz-swap` (uses 0.2.3)
- Must use MetaMask Flask, not regular MetaMask
- Snap must be local during development (production requires npm publish)
- Lightning only available on Bitcoin mainnet (Signet has no Boltz server)
- Network switching requires wallet reconnection (creates new wallet instance)

## Important Notes

- Private keys are NEVER exposed to the dapp - only the snap can access them (unless user explicitly exports via `arkade_exportPrivateKey`)
- Private key export shows a critical warning dialog requiring explicit user confirmation
- Snap runs in sandboxed environment isolated from web pages
- Keys are derived deterministically from MetaMask entropy (no storage needed)
- Network can be switched via `switchNetwork()` function in the UI
- VTXOs expire after a certain time - check `expiry` field
- Lightning swaps have maximum amount limits set by Boltz
