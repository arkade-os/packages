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

# Clean build artifacts
pnpm clean

# Rebuild from scratch
pnpm build:clean
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

### Monorepo Structure
```
packages/
├── snap/          # MetaMask Snap (backend)
│   ├── src/
│   │   ├── index.ts      # RPC request handlers (entry point)
│   │   └── wallet.ts     # Arkade SDK integration & wallet logic
│   └── snap.manifest.json
└── site/          # React frontend (dapp)
    └── src/
        ├── components/
        │   └── MetaMaskProvider.tsx  # React Context for snap communication
        └── App.tsx
```

### Snap Architecture (packages/snap)

**Entry Point: [index.ts](packages/snap/src/index.ts)**
- Exports `onRpcRequest` handler that processes all snap RPC calls
- Routes requests to appropriate handlers
- Shows MetaMask dialogs for user confirmation and displaying results
- All handlers follow pattern: validate → confirm with user → execute → show result

**Core Wallet Logic: [wallet.ts](packages/snap/src/wallet.ts)**
- Manages private key storage via MetaMask's `snap_manageState` API
- Initializes Arkade SDK `Wallet` instances from stored keys
- Implements all Bitcoin/Lightning operations:
  - `createWallet()` - Generates new key using `SingleKey.fromRandomBytes()`
  - `getBalance()` - Returns both on-chain UTXOs and off-chain VTXOs
  - `sendBitcoin()` - Sends via Ark protocol (instant VTXOs)
  - `getTransactionHistory()` - Fetches history from Arkade SDK
  - `payLightningInvoice()` - Submarine swap (Ark VTXO → Lightning)
  - `createLightningInvoice()` - Reverse swap (Lightning → Ark VTXO)
- Uses `ArkadeLightning` class from `@arkade-os/boltz-swap` for Lightning operations
- Configures network endpoints in `ARKADE_CONFIG` object (testnet, mutinynet, bitcoin, regtest)

**State Management:**
- Private keys stored in encrypted MetaMask state (never exposed to dapp)
- Wallet data (addresses, created timestamp) stored separately
- Network configuration persisted per wallet

**Permission Requirements (snap.manifest.json):**
- `snap_dialog` - Show confirmation/alert dialogs
- `snap_manageState` - Store encrypted wallet data
- `endowment:rpc` - Accept RPC calls from dapps
- `endowment:network-access` - Connect to Arkade servers and Esplora

### Frontend Architecture (packages/site)

**Communication Pattern:**
1. React components use `useMetaMask()` hook
2. Hook methods call `invokeSnap()` helper
3. Helper uses `window.ethereum.request()` with `wallet_invokeSnap`
4. Request routed to snap's `onRpcRequest` handler
5. Response returned to frontend via Promise

**MetaMaskProvider Context ([MetaMaskProvider.tsx](packages/site/src/components/MetaMaskProvider.tsx)):**
- Manages snap connection state
- Provides methods that map 1:1 to snap RPC methods
- Handles loading states and errors
- Auto-connects if snap is installed
- Local snap ID: `local:http://localhost:8080`

**State Flow:**
```
User Action → Component → useMetaMask() → invokeSnap() → MetaMask → Snap → Arkade SDK → Bitcoin Network
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

All snap methods are prefixed with `arkade_` and follow the pattern:
```typescript
await ethereum.request({
  method: 'wallet_invokeSnap',
  params: {
    snapId: 'local:http://localhost:8080',
    request: { method: 'arkade_methodName', params: {...} }
  }
});
```

**Available Methods:**
- `arkade_getWallet` - Get wallet addresses and network
- `arkade_createWallet` - Create new wallet (params: `{network}`)
- `arkade_importWallet` - Import wallet (NOT YET IMPLEMENTED)
- `arkade_getBalance` - Get on-chain and off-chain balances + VTXO list
- `arkade_send` - Send Bitcoin (params: `{to, amount, asset}`)
- `arkade_getTransactionHistory` - Fetch transaction history
- `arkade_payLightningInvoice` - Pay Lightning invoice (params: `{invoice, maxFeeSats}`)
- `arkade_createLightningInvoice` - Create invoice to receive (params: `{amount, description}`)
- `arkade_resetWallet` - Delete all wallet data

All methods return: `{success: boolean, data?: any, message?: string}`

## Testing Requirements

**Prerequisites:**
- MetaMask Flask (developer version) installed
- Frontend running on localhost:8000
- Snap built and served on localhost:8080

**Test Flow:**
1. Build snap: `cd packages/snap && pnpm build`
2. Start development: `pnpm start` (from root)
3. Open http://localhost:8000
4. Click "Connect Snap" - approves snap installation
5. Create wallet - choose network (testnet recommended)
6. Fund wallet via boarding address (on-chain deposit)
7. Wait for confirmation, funds appear as VTXOs
8. Test send/receive and Lightning operations

**Important Testing Notes:**
- First deposit requires on-chain confirmation (boarding)
- Subsequent transfers use VTXOs (instant)
- Lightning requires funded wallet with VTXOs
- Network must have Boltz swap provider for Lightning (check `ARKADE_CONFIG`)

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
