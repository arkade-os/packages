# Arkade Wallet - MetaMask Snap

![Arkade Wallet](./packages/site/public/logo.png)

A modern MetaMask Snap that brings Bitcoin, Lightning and Ark functionality to your browser. Built with [Arkade SDK](https://arkadeos.com) and [MetaMask Snaps](https://metamask.io/snaps/), this project demonstrates a **simplified provider pattern** where the Snap only handles Bitcoin signing operations, while all wallet logic runs in the frontend.

## Architecture

This project uses a **simplified provider pattern** where the Snap only handles Bitcoin signing operations, while all wallet logic runs in the frontend:

- **`packages/snap`** - Minimal MetaMask Snap that provides Bitcoin key management and PSBT signing (only ~97 lines of code!)
- **`packages/site`** - React dapp that runs Arkade SDK directly using MetaMaskSnapIdentity provider

### How It Works

```
┌─────────────────────────────────────────┐
│  Frontend (Dapp)                        │
│  ┌────────────────────────────────┐    │
│  │ Arkade SDK Wallet              │    │
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
│  │  - bitcoin_getAccounts()       │    │
│  │  - bitcoin_signPsbt()          │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Simpler snap code (easier to audit)
- ✅ Faster development (no snap rebuild for wallet changes)
- ✅ Better UX (all data fetching in dapp)
- ✅ Follows security best practices (snap only handles sensitive operations)

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [pnpm](https://pnpm.io/) v8 or later
- [MetaMask Flask](https://metamask.io/flask/) - Developer version of MetaMask

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd arkade-metamask-snap
pnpm install
```

### 2. Start Development

Run both the Snap and the frontend in watch mode:

```bash
pnpm start
```

This will:

- Start the Snap server at `http://localhost:8080`
- Start the frontend dapp at `http://localhost:8000`

### 3. Connect to MetaMask Flask

1. Open [http://localhost:8000](http://localhost:8000) in your browser
2. Make sure you have MetaMask Flask installed
3. Click "Connect Snap" to install the Arkade Wallet Snap
4. Create a new wallet or import an existing one
5. Start using your Arkade Wallet!

## Available Scripts

### Root

- `pnpm start` - Start both snap and site in development mode
- `pnpm build` - Build both packages
- `pnpm clean` - Clean all build artifacts
- `pnpm test` - Run tests in all packages

### Snap Package (`packages/snap`)

- `pnpm start` - Watch mode for development (auto-rebuilds on changes)
- `pnpm stop` - Stop the snap server (kills process on port 8080)
- `pnpm build` - Build the snap bundle
- `pnpm rebuild` - Clean, build, and serve the snap
- `pnpm serve` - Serve the snap locally
- `pnpm clean` / `pnpm delete` - Clean build artifacts
- `pnpm lint` - Lint the code
- `pnpm test` - Run tests

### Site Package (`packages/site`)

- `pnpm dev` - Start Vite development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Lint the code

## Snap RPC Methods

The Arkade Wallet Snap is **minimal by design** and only exposes 2 RPC methods for Bitcoin signing:

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
//     publicKey: "02...",          // Full public key (33 bytes)
//     xOnlyPublicKey: "..."        // x-only public key (32 bytes)
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

All wallet logic (balance, transactions, Lightning) runs in the **frontend** using the Arkade SDK with a `MetaMaskSnapIdentity` provider. This makes the snap:
- ✅ **Simpler** - Easier to audit and maintain
- ✅ **More secure** - Minimal attack surface
- ✅ **Faster** - No RPC overhead for data queries
- ✅ **More flexible** - Update wallet logic without snap rebuild

The frontend uses the snap only for signing operations, keeping private keys secure in MetaMask.

## Project Structure

```
arkade-metamask-snap/
├── packages/
│   ├── snap/                    # MetaMask Snap
│   │   ├── src/
│   │   │   ├── index.ts         # Main snap entry point with RPC handlers
│   │   │   └── wallet.ts        # Arkade SDK wallet integration
│   │   ├── images/
│   │   │   └── icon.svg         # Snap icon
│   │   ├── package.json
│   │   ├── snap.manifest.json   # Snap configuration
│   │   └── tsconfig.json
│   └── site/                    # Frontend dapp
│       ├── src/
│       │   ├── components/
│       │   │   ├── Header.tsx
│       │   │   ├── WalletConnect.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── SendModal.tsx
│       │   │   ├── LightningModal.tsx
│       │   │   └── MetaMaskProvider.tsx
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── public/
│       │   ├── logo.png
│       │   └── icon.svg
│       └── package.json
├── Logo/                        # Brand assets
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Design System

The app uses a modern purple color scheme inspired by the Arkade brand:

- **Primary Purple**: `#8B5CF6`
- **Dark Purple**: `#7C3AED`
- **Light Purple**: `#A78BFA`
- **Background**: `#F5F3FF`
- **Typography**: Geist TT First Neue Trial

## Technologies Used

- **MetaMask Snaps SDK** - For building the browser extension snap
- **Arkade SDK v0.3.1-alpha.3** - Bitcoin Layer 2 wallet functionality
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **pnpm** - Fast, disk space efficient package manager


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Resources

- [Arkade OS Documentation](https://arkadeos.com)
- [MetaMask Snaps Documentation](https://docs.metamask.io/snaps/)
- [Arkade SDK on npm](https://www.npmjs.com/package/@arkade-os/sdk)

## License

MIT
