import { base64, hex, bech32 } from '@scure/base';
import { panel, heading, text, divider } from '@metamask/snaps-sdk';
import { Transaction, SingleKey, ArkAddress, NetworkName } from '@arkade-os/sdk';
import { validateInputIndexes, validateNetwork, validatePsbt, validateSignerPubkey } from './utils';
import { ArkadeAddress, PubKeyHex, XOnlyPubKeyHex } from './types';


/**
 * Get public keys from snap's deterministic key derivation.
 * This ensures the same keys are always generated for the same MetaMask account.
 */
export async function getPublicKey(): Promise<{ compressedPublicKey: PubKeyHex; xOnlyPublicKey: XOnlyPubKeyHex }> {
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  // Derive the private key from entropy (remove 0x prefix)
  const privateKeyHex = entropy.slice(2);

  // Create identity from private key
  const identity = SingleKey.fromHex(privateKeyHex);

  // Get public keys from identity
  const [compressedPublicKeyBytes, xOnlyPublicKeyBytes] = await Promise.all([
    identity.compressedPublicKey(),
    identity.xOnlyPublicKey(),
  ]);

  return {
    compressedPublicKey: hex.encode(compressedPublicKeyBytes),
    xOnlyPublicKey: hex.encode(xOnlyPublicKeyBytes),
  };
}

/**
 * Export private key with user confirmation.
 * WARNING: This exposes the private key! Only use for backup purposes.
 *
 * Returns the private key in multiple formats:
 * - hex: Raw hexadecimal format (64 chars)
 * - nsec: Nostr secret key format (bech32 encoded with 'nsec' prefix)
 */
export async function exportPrivateKey(): Promise<{ hex: string; nsec: string }> {
  // Show critical warning dialog to user
  const confirmed = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('⚠️ Export Private Key'),
        text('**WARNING**: Your private key controls all your funds!'),
        divider(),
        text('Never share your private key with anyone. Anyone with access to your private key can steal all your Bitcoin.'),
        text('Only export your private key if you need to:'),
        text('• Backup your wallet\n• Import into another wallet\n• Migrate to a different platform'),
        divider(),
        text('Store it securely offline. Do not screenshot or send via email/messaging apps.'),
      ]),
    },
  });

  if (!confirmed) {
    throw new Error('User rejected private key export');
  }

  // Get the private key
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  // Derive the private key from entropy (remove 0x prefix)
  const privateKeyHex = entropy.slice(2);

  // Encode as nsec (Nostr secret key format)
  // nsec is bech32 encoding of the 32-byte private key with 'nsec' prefix
  const privateKeyBytes = hex.decode(privateKeyHex);
  const words = bech32.toWords(privateKeyBytes);
  const nsec = bech32.encode('nsec', words);

  return {
    hex: privateKeyHex,
    nsec,
  };
}

/**
 * Get Arkade address and public keys from snap's deterministic key derivation.
 * This ensures the same wallet address is always generated for the same MetaMask account.
 *
 * Note: We fetch server info to get the server info, then build the Ark address
 * without creating a full wallet instance
 */
export async function getAddress(params: unknown): Promise<{ address: ArkadeAddress; }> {
  // Validate params structure
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params: expected object');
  }

  const { network, signerPubkey } = params as { network: unknown; signerPubkey: unknown };

  // Validate individual parameters
  const validatedNetwork = validateNetwork(network);
  const validatedSignerPubkey = validateSignerPubkey(signerPubkey);

  const serverPubKeyBytes = hex.decode(validatedSignerPubkey);
  const prefix = validatedNetwork === 'bitcoin' ? 'ark' : 'tark';
  
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  // Derive the private key from entropy (remove 0x prefix)
  const privateKeyHex = entropy.slice(2);

  // Create identity from private key
  const identity = SingleKey.fromHex(privateKeyHex);
  const xOnlyPublicKeyBytes = await identity.xOnlyPublicKey()
  
  const arkadeAddress = new ArkAddress(
    serverPubKeyBytes,
    xOnlyPublicKeyBytes,
    prefix,
  );

  return { address: arkadeAddress.encode() };
}

/**
 * Sign a PSBT with the snap's Bitcoin key
 */
export async function signPsbt(params: unknown): Promise<{ psbt: string }> {
  // Validate params structure
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params: expected object');
  }

  const { psbt, inputIndexes } = params as { psbt: unknown; inputIndexes: unknown };

  // Validate individual parameters
  const validatedPsbt = validatePsbt(psbt);
  const validatedInputIndexes = validateInputIndexes(inputIndexes);

  console.log('[Snap] signPsbt called with:', {
    psbtLength: validatedPsbt.length,
    inputIndexes: validatedInputIndexes,
  });

  // Decode PSBT
  let psbtBytes: Uint8Array;
  try {
    psbtBytes = base64.decode(validatedPsbt);
  } catch (error) {
    throw new Error(`Failed to decode PSBT: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
  console.log('[Snap] PSBT length:', psbtBytes.length);

  const tx = Transaction.fromPSBT(psbtBytes);
  console.log('[Snap] Transaction before signing:', {
    inputsLength: tx.inputsLength,
    outputsLength: tx.outputsLength,
    hasWitnesses: tx.hasWitnesses,
  });

  // Get the private key and create identity (consistent with getAddress())
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });
  const privateKeyHex = entropy.slice(2);
  console.log('[Snap] Got private key, length:', privateKeyHex.length);

  // Create identity from private key
  const identity = SingleKey.fromHex(privateKeyHex);

  // Sign the transaction using SingleKey's sign method
  console.log('[Snap] Signing inputs:', validatedInputIndexes);
  const signedTx = await identity.sign(tx, validatedInputIndexes);

  console.log('[Snap] Transaction after signing:', {
    inputsLength: signedTx.inputsLength,
    outputsLength: signedTx.outputsLength,
    hasWitnesses: signedTx.hasWitnesses,
    isFinal: signedTx.isFinal,
  });

  // Convert signed transaction back to PSBT
  const signedPsbt = signedTx.toPSBT();
  const signedPsbtBase64 = base64.encode(signedPsbt);

  console.log('[Snap] Signed PSBT length:', signedPsbt.length);

  return {
    psbt: signedPsbtBase64,
  };
}
