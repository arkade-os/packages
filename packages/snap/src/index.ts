import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { getAddress, getPublicKey, exportPrivateKey, signPsbt } from './wallet';

/**
 * Handle incoming JSON-RPC requests from dapps.
 *
 * This snap provides a simple Bitcoin signing interface:
 * - arkade_getPublicKey: Get the snap's public keys
 *   No params required
 *   Returns: { compressedPublicKey: string, xOnlyPublicKey: string }
 * - arkade_exportPrivateKey: Export private key (WITH USER CONFIRMATION!)
 *   No params required
 *   Returns: { hex: string, nsec: string }
 *   WARNING: Shows confirmation dialog to user before exposing private key
 * - arkade_getAddress: Get the Bitcoin Arkade address
 *   Params: { network: NetworkName, signerPubkey: string, unilateralExitDelay: string }
 *   - network: 'bitcoin' | 'testnet' | 'signet' | 'mutinynet' | 'regtest'
 *   - signerPubkey: Server's x-only public key (64 hex chars)
 *   - unilateralExitDelay: CSV timelock value from server (string representation of bigint)
 *   Returns: { address: string }
 * - arkade_signPsbt: Sign a PSBT with the snap's key
 *   Params: { psbt: string, inputIndexes: number[] }
 *   - psbt: Base64-encoded PSBT
 *   - inputIndexes: Array of input indexes to sign (non-negative integers)
 *   Returns: { psbt: string }
 *
 * All wallet logic (balance, transactions, Lightning) runs in the dapp using Arkade SDK.
 * All parameters are validated inside the handler functions.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  console.log('Received request:', request.method, 'from:', origin);

  switch (request.method) {
    case 'arkade_getPublicKey':
      // No params required
      return await getPublicKey();

    case 'arkade_exportPrivateKey':
      // No params required - shows confirmation dialog
      return await exportPrivateKey();

    case 'arkade_getAddress':
      // Params validated inside getAddress
      return await getAddress(request.params);

    case 'arkade_signPsbt':
      // Params validated inside signPsbt
      return await signPsbt(request.params);

    default:
      throw new Error(`Method not found: ${request.method}`);
  }
};
