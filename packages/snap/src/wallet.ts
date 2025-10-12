import { base64, hex } from '@scure/base';
import { Transaction } from '@scure/btc-signer';

/**
 * Get Bitcoin account from snap's deterministic key derivation.
 * This ensures the same wallet address is always generated for the same MetaMask account.
 */
export async function getBitcoinAccounts(): Promise<{ accounts: Array<{ address: string; publicKey: string; xOnlyPublicKey: string }> }> {
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  // Derive the private key from entropy (remove 0x prefix)
  const privateKeyHex = entropy.slice(2, 66);

  // Import SDK to derive public key and address
  const { SingleKey } = await import('@arkade-os/sdk');
  const signer = SingleKey.fromHex(privateKeyHex);

  // Get Bitcoin taproot address using the address method
  // We need to create a temporary wallet to get the address
  const { Wallet } = await import('@arkade-os/sdk');
  const tempWallet = await Wallet.create({
    identity: signer,
    // Use a dummy URL since we only need the address
    arkServerUrl: 'https://signet.arkade.sh',
  });

  const address = await tempWallet.getAddress();

  // Get the public key - we need to get it from the signer
  // The signer has the private key, we'll derive the public key
  const privKeyBytes = hex.decode(privateKeyHex);

  // Use secp256k1 to derive public key
  const { secp256k1 } = await import('@noble/curves/secp256k1.js');
  const publicKeyBytes = secp256k1.getPublicKey(privKeyBytes, true); // compressed
  const fullPubKey = hex.encode(publicKeyBytes);

  // Get x-only public key (remove first byte prefix for compressed key)
  const xOnlyPubKey = publicKeyBytes.length === 33 ? hex.encode(publicKeyBytes.slice(1)) : fullPubKey;

  return {
    accounts: [
      {
        address,
        publicKey: fullPubKey,
        xOnlyPublicKey: xOnlyPubKey,
      },
    ],
  };
}

/**
 * Sign a PSBT with the snap's Bitcoin key
 */
export async function signPsbt(params: { psbt: string; inputIndexes: number[] }): Promise<{ psbt: string }> {
  const { psbt: psbtBase64, inputIndexes } = params;

  // Get the private key
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  const privateKeyHex = entropy.slice(2, 66);

  // Import SDK
  const { SingleKey } = await import('@arkade-os/sdk');
  const signer = SingleKey.fromHex(privateKeyHex);

  // Decode PSBT
  const psbtBytes = base64.decode(psbtBase64);
  const tx = Transaction.fromPSBT(psbtBytes);

  // Sign the specified inputs
  for (const inputIndex of inputIndexes) {
    tx.signIdx(signer, inputIndex);
  }

  // Finalize and return signed PSBT
  tx.finalize();
  const signedPsbt = tx.toPSBT();
  const signedPsbtBase64 = base64.encode(signedPsbt);

  return {
    psbt: signedPsbtBase64,
  };
}
