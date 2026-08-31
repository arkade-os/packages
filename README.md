# Arkade Wallet Connectors

Browser wallet connectors for Arkade - MetaMask Snap, Sats Connect, and a shared provider interface.

Built with the [Arkade SDK](https://docs.arkadeos.com/wallets) for instant offchain Bitcoin transactions (virtual transactions) and Lightning Network.

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
│  │  - Virtual output management    │    │
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

## Packages

- `@arkade-os/wallet-providers` - shared provider interface the connectors implement
- `@arkade-os/sats-connect` - Sats Connect connector (Xverse and compatible wallets)
- `@arkade-os/sats-connect-react` - React bindings for the Sats Connect connector
- `@arkade-os/snap` - MetaMask Snap for Arkade

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v8+
- [MetaMask Flask](https://snaps.metamask.io/) with Snaps support
- [Xverse Wallet](https://xverse.app/) for the Sats Connect demo

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
