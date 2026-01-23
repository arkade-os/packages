# Arkade × Xverse Demo

This is a demo web application that integrates the Arkade SDK with Xverse wallet using the Sats Connect web provider standard.

## Overview

This demo showcases how to use Xverse wallet as the signing provider for Arkade Bitcoin Layer 2 transactions. Instead of using MetaMask Snap (as shown in the main `/packages/site` app), this implementation uses Xverse wallet through the Sats Connect API.

## Key Components

### XverseIdentity Provider (`src/utils/XverseIdentity.ts`)

An implementation of the Arkade SDK's `Identity` interface that uses Xverse wallet for signing operations:

- **xOnlyPublicKey()** - Returns the x-only public key (32 bytes)
- **compressedPublicKey()** - Returns the compressed public key (33 bytes)
- **sign(tx, inputIndexes)** - Signs a transaction using Xverse wallet via Sats Connect
- **signMessage()** - Signs messages (placeholder for future implementation)
- **signerSession()** - Returns MuSig2 session stub (not yet supported)

### XverseProvider Context (`src/components/XverseProvider.tsx`)

A React context that manages the Arkade Wallet instance with XverseIdentity:

- Connects to Xverse wallet via Sats Connect
- Creates Arkade Wallet instance with XverseIdentity provider
- Provides wallet operations: send, receive, balance queries, Lightning payments
- Supports network switching (Bitcoin mainnet / Signet testnet)

### Dashboard (`src/components/Dashboard.tsx`)

A simple UI demonstrating all wallet features:

- Display wallet addresses and balance
- Send Bitcoin to any address
- Onboard funds from boarding address to VTXOs
- Pay Lightning invoices (submarine swap)
- Create Lightning invoices (reverse swap)
- View VTXOs list

## How It Works

```
┌─────────────────────────────────────────┐
│  Demo App (React)                       │
│  ┌────────────────────────────────┐    │
│  │ Arkade SDK Wallet              │    │
│  │  + XverseIdentity              │    │
│  │  - Balance queries             │    │
│  │  - Transaction history         │    │
│  │  - Lightning operations        │    │
│  │  - VTXO management             │    │
│  └──────────┬─────────────────────┘    │
│             │                            │
│             │ (signing requests only)    │
│             ▼                            │
│  ┌────────────────────────────────┐    │
│  │ Xverse Wallet (Sats Connect)   │    │
│  │  - getAccounts()               │    │
│  │  - signPsbt()                  │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ **Self-custodial** - Keys remain in Xverse wallet
- ✅ **Standard compliant** - Uses Sats Connect web provider standard
- ✅ **Flexible** - All wallet logic runs in browser via Arkade SDK
- ✅ **Fast** - No RPC overhead for balance/transaction queries

## Sats Connect Integration

The app uses the [Sats Connect](https://docs.xverse.app/sats-connect) library to interact with Xverse wallet:

### Getting Accounts

```typescript
import { request } from 'sats-connect';

const response = await request('getAccounts', {
  purposes: ['payment', 'ordinals'],
  message: 'Connect to Arkade',
  network: { type: 'Mainnet' }
});

// Returns: { addresses: [{ address, publicKey, purpose }] }
```

### Signing PSBTs

```typescript
const response = await request('signPsbt', {
  psbt: psbtBase64,
  signInputs: {
    [paymentAddress]: [0, 1, 2] // Input indexes to sign
  },
  broadcast: false
});

// Returns: { psbt: signedPsbtBase64 }
```

## Installation

```bash
cd xverse
npm install
# or
pnpm install
```

## Development

```bash
npm run dev
# or
pnpm dev
```

The app will open at http://localhost:3000

## Building

```bash
npm run build
# or
pnpm build
```

## Usage

1. **Install Xverse Wallet**
   - Download from [xverse.app](https://www.xverse.app/)
   - Available for Chrome, Firefox, and mobile

2. **Connect Wallet**
   - Click "Connect Xverse Wallet"
   - Approve the connection in Xverse popup
   - App will request access to your payment and ordinals addresses

3. **Fund Your Wallet**
   - Copy your boarding address
   - Send Bitcoin to the boarding address (on-chain transaction)
   - Wait for confirmation
   - Click "Onboard Funds to VTXOs" to convert to off-chain VTXOs

4. **Send Bitcoin**
   - Enter recipient address and amount
   - Click "Send"
   - Sign the transaction in Xverse wallet
   - Transaction is instant (off-chain VTXO transfer)

5. **Lightning Network** (Bitcoin mainnet only)
   - **Pay Invoice**: Paste Lightning invoice, click "Pay Invoice"
   - **Receive**: Enter amount, click "Create Invoice", share invoice with sender

## Network Support

- **Bitcoin Mainnet**: Full support including Lightning Network
- **Bitcoin Signet**: Testnet for development (no Lightning support)

Switch networks using the dropdown in the header.

## Technical Details

### Identity Interface Implementation

The `XverseIdentity` class implements the same interface as `MetaMaskSnapIdentity`, making it a drop-in replacement:

```typescript
interface Identity {
  xOnlyPublicKey(): Promise<Uint8Array>;
  compressedPublicKey(): Promise<Uint8Array>;
  sign(tx: Transaction, inputIndexes?: number[]): Promise<Transaction>;
  signMessage(message: Uint8Array, type: 'schnorr' | 'ecdsa'): Promise<Uint8Array>;
  signerSession(): SignerSession;
  getAddress(): string;
}
```

### Signing Flow

1. Arkade SDK calls `identity.sign(tx, inputIndexes)`
2. `XverseIdentity.sign()` converts Transaction to PSBT
3. PSBT is base64-encoded and sent to Xverse via `signPsbt`
4. User approves in Xverse wallet
5. Signed PSBT is returned and converted back to Transaction
6. Arkade SDK finalizes and broadcasts the transaction

### PSBT Format

The integration uses the standard Bitcoin PSBT (Partially Signed Bitcoin Transaction) format:

- Transaction converted to PSBT: `tx.toPSBT()`
- PSBT encoded as base64: `base64.encode(psbt)`
- Xverse signs specified inputs
- Signed PSBT decoded: `base64.decode(signedPsbt)`
- Transaction reconstructed: `Transaction.fromPSBT(signedPsbtBytes)`

## Dependencies

- **@arkade-os/sdk** (0.3.12) - Arkade Bitcoin Layer 2 wallet SDK
- **@arkade-os/boltz-swap** (0.2.18) - Lightning Network integration via Boltz
- **sats-connect** (^2.7.0) - Xverse wallet integration library
- **@scure/base** (^2.0.0) - Base64/hex encoding utilities
- **@scure/btc-signer** (^2.0.1) - Bitcoin transaction signing

## Limitations

- MuSig2 signing not yet implemented
- Message signing not yet implemented
- Lightning only available on Bitcoin mainnet (Boltz limitation)

## Resources

- [Arkade SDK Documentation](https://github.com/arkade-os/arkade-sdk)
- [Sats Connect Documentation](https://docs.xverse.app/sats-connect)
- [Xverse Wallet](https://www.xverse.app/)
- [Bitcoin PSBT Specification](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)

## License

MIT
