# Arkade Packages

Arkade packages for the web - wallet integrations, checkout, swaps, and more.

Built with [Arkade SDK](https://docs.arkadeos.com/wallets) for instant off-chain Bitcoin transactions (VTXOs) and Lightning Network.

## How It Works

The Arkade SDK runs in the browser and handles all wallet logic. The wallet provider only handles signing:

```text
┌─────────────────────────────────────────┐
│  Browser                                │
│  ┌────────────────────────────────┐    │
│  │ Arkade SDK                     │    │
│  │  - Balance queries             │    │
│  │  - Transaction history         │    │
│  │  - Lightning operations        │    │
│  │  - VTXO management             │    │
│  └──────────┬─────────────────────┘    │
│             │ (signing requests only)   │
│             ▼                           │
│  ┌────────────────────────────────┐    │
│  │ Wallet Provider                │    │
│  │  - Key derivation              │    │
│  │  - PSBT signing                │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```



## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v8+
- [MetaMask Flask](https://snaps.metamask.io/) with Snaps support
- [Xverse Wallet](https://xverse.app/) for Sats Connect demo

### Development

```bash
# Build all packages
pnpm build

# Run all demos
pnpm start

# Run tests
pnpm test

# Lint
pnpm lint
```

## Resources

- [Arkade SDK Documentation](https://docs.arkadeos.com/wallets)
- [MetaMask Snaps](https://docs.metamask.io/snaps/)
- [Sats Connect](https://docs.xverse.app/sats-connect)

## License

MIT
