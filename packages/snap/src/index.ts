import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { getBitcoinAccounts, signPsbt } from './wallet';

/**
 * Handle incoming JSON-RPC requests from dapps.
 *
 * This snap provides a simple Bitcoin signing interface:
 * - bitcoin_getAccounts: Get the Bitcoin taproot address and public keys
 * - bitcoin_signPsbt: Sign a PSBT with the snap's key
 *
 * All wallet logic (balance, transactions, Lightning) runs in the dapp using Arkade SDK.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  console.log('Received request:', request.method, 'from:', origin);

  switch (request.method) {
    case 'bitcoin_getAccounts':
      return await getBitcoinAccounts();

    case 'bitcoin_signPsbt':
      return await signPsbt(request.params as { psbt: string; inputIndexes: number[] });

    default:
      throw new Error(`Method not found: ${request.method}`);
  }
};
