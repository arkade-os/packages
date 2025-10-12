import { base64, hex } from '@scure/base';
import { Transaction } from '@scure/btc-signer';
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

  // Get the private key
  const entropy = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'bitcoin-arkade-snap',
    },
  });

  const privateKeyHex = entropy.slice(2, 66);

  // Decode PSBT
  const psbtBytes = base64.decode(psbtBase64);
  const tx = Transaction.fromPSBT(psbtBytes);

  // Sign the specified inputs
  for (const inputIndex of inputIndexes) {
    tx.signIdx(hex.decode(privateKeyHex), inputIndex);
  }

  // Finalize and return signed PSBT
  tx.finalize();
  const signedPsbt = tx.toPSBT();
  const signedPsbtBase64 = base64.encode(signedPsbt);

  return {
    psbt: signedPsbtBase64,
  };
}
