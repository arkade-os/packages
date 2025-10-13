import { base64, hex } from '@scure/base';
import { Transaction, SigHash } from '@scure/btc-signer';
import { SingleKey, Wallet } from '@arkade-os/sdk';

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

  const identity = SingleKey.fromHex(privateKeyHex);

  // Get Bitcoin taproot address using the address method
  const tempWallet = await Wallet.create({
    identity,
    // Use a dummy URL since we only need the address
    arkServerUrl: 'https://signet.arkade.sh',
  });

  const [address, publicKeyBytes, xOnlyPublicKeyBytes] = await Promise.all([
    tempWallet.getAddress(),
    identity.compressedPublicKey(),
    identity.xOnlyPublicKey(),
  ]);

  return {
    accounts: [
      {
        address,
        publicKey: hex.encode(publicKeyBytes),
        xOnlyPublicKey: hex.encode(xOnlyPublicKeyBytes),
      },
    ],
  };
}

/**
 * Sign a PSBT with the snap's Bitcoin key
 */
export async function signPsbt(params: { psbt: string; inputIndexes: number[] }): Promise<{ psbt: string }> {
  const { psbt: psbtBase64, inputIndexes } = params;

  console.log('[Snap] signPsbt called with:', {
    psbtLength: psbtBase64.length,
    inputIndexes,
  });

  // Get the private key
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  const privateKeyHex = entropy.slice(2, 66);
  console.log('[Snap] Got private key, length:', privateKeyHex.length);

  // Decode PSBT
  const psbtBytes = base64.decode(psbtBase64);
  console.log('[Snap] PSBT length:', psbtBytes.length);

  const tx = Transaction.fromPSBT(psbtBytes);
  console.log('[Snap] Transaction before signing:', {
    inputsLength: tx.inputsLength,
    outputsLength: tx.outputsLength,
    hasWitnesses: tx.hasWitnesses,
  });

  // Prepare signing parameters (same as SingleKey implementation)
  const ALL_SIGHASH = Object.values(SigHash).filter((x) => typeof x === 'number');
  const ZERO_32 = new Uint8Array(32).fill(0);

  console.log('[Snap] Signing with ALL_SIGHASH:', ALL_SIGHASH, 'ZERO_32 length:', ZERO_32.length);

  const signResults: boolean[] = [];

  for (const inputIndex of inputIndexes) {
    try {
      console.log(`[Snap] Signing input ${inputIndex}...`);
      const signSuccess = tx.signIdx(hex.decode(privateKeyHex), inputIndex, ALL_SIGHASH, ZERO_32);
      if (!signSuccess) {
        throw new Error(`[Snap] Failed to sign input ${inputIndex}`);
      }

      console.log(`[Snap] Signed input ${inputIndex}`);
      signResults.push(signSuccess);
    } catch (error) {
      console.error(`[Snap] Error signing input ${inputIndex}:`, error);
      throw error;
    }
  }

  console.log('[Snap] Transaction after signing and finalizing:', {
    inputsLength: tx.inputsLength,
    outputsLength: tx.outputsLength,
    hasWitnesses: tx.hasWitnesses,
    isFinal: tx.isFinal,
  });

  // Check if any signing failed
  const allSigned = signResults.every((result) => result === true);
  if (!allSigned) {
    console.error('[Snap] Some inputs failed to sign:', signResults);
    throw new Error(`Failed to sign inputs: ${signResults.map((r, i) => `input ${i}: ${r}`).join(', ')}`);
  }

  const signedPsbt = tx.toPSBT();
  const signedPsbtBase64 = base64.encode(signedPsbt);

  console.log('[Snap] Signed PSBT length:', signedPsbt.length);

  return {
    psbt: signedPsbtBase64,
  };
}
