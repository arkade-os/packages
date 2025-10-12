import { base64, hex } from '@scure/base';
import { Transaction } from '@scure/btc-signer';

/**
 * MetaMask Snap identity implementation for Bitcoin signing.
 * Provides the same interface as other Identity providers but uses MetaMask Snap.
 *
 * This allows the Arkade SDK Wallet to run entirely in the dapp while
 * delegating signing operations to the MetaMask Snap.
 */
export class MetaMaskSnapIdentity {
  publicKey: Uint8Array;
  address: string;
  ethereum: any;
  snapId: string;

  constructor(publicKey: string | Uint8Array, address: string, ethereum: any) {
    this.publicKey = typeof publicKey === 'string' ? hex.decode(publicKey) : publicKey;
    this.address = address;
    this.ethereum = ethereum;
    this.snapId = 'local:http://localhost:8080';
  }

  /**
   * Get x-only public key (32 bytes, no prefix)
   */
  xOnlyPublicKey(): Uint8Array {
    const fullPubkey = this.publicKey;
    return fullPubkey.length === 33 ? fullPubkey.slice(1) : fullPubkey;
  }

  /**
   * Get the Bitcoin address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Check if snap is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const accounts = await this.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: this.snapId,
          request: { method: 'bitcoin_getAccounts' },
        },
      });

      return accounts && accounts.accounts && accounts.accounts.length > 0;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  /**
   * Reconnect to snap
   */
  async reconnect(): Promise<boolean> {
    try {
      await this.ethereum.request({
        method: 'wallet_requestSnaps',
        params: { [this.snapId]: {} },
      });

      return await this.isConnected();
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }

  /**
   * Sign a transaction using the MetaMask Snap
   *
   * @param tx - The transaction to sign
   * @param inputIndexes - Optional array of input indexes to sign. If null, signs all inputs.
   * @returns The signed transaction
   */
  async sign(tx: Transaction, inputIndexes: number[] | null = null): Promise<Transaction> {
    console.log('MetaMaskSnapIdentity.sign called with:', {
      inputIndexes,
      txInputsLength: tx.inputsLength,
      address: this.address,
    });

    try {
      // Check connection
      const isConnected = await this.isConnected();
      if (!isConnected) {
        const reconnected = await this.reconnect();
        if (!reconnected) {
          throw new Error('Snap not connected');
        }
      }

      // Convert transaction to PSBT
      const psbt = tx.toPSBT();
      const psbtBase64 = base64.encode(psbt);

      // Determine which inputs to sign
      let signInputs: number[];
      if (inputIndexes) {
        signInputs = inputIndexes;
      } else {
        signInputs = Array.from({ length: tx.inputsLength }, (_, i) => i);
      }

      // Call snap to sign PSBT
      const requestParams = {
        psbt: psbtBase64,
        inputIndexes: signInputs,
      };

      const response = await this.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: this.snapId,
          request: {
            method: 'bitcoin_signPsbt',
            params: requestParams,
          },
        },
      });

      if (response && response.psbt) {
        const signedPsbtBytes = base64.decode(response.psbt);
        const signedTx = Transaction.fromPSBT(signedPsbtBytes);
        console.log('Successfully created signed transaction');
        return signedTx;
      } else {
        throw new Error('No signed PSBT returned from snap');
      }
    } catch (error: any) {
      console.error('Snap signing failed:', error);

      // Handle specific error codes
      if (error.code === 4001) {
        throw new Error('User rejected the signing request');
      } else if (error.code === 4100) {
        throw new Error(
          'The requested method and/or account has not been authorized by the user'
        );
      } else if (error.code === -32002) {
        throw new Error('A request is already pending. Please wait.');
      } else if (
        error.message?.includes('network') ||
        error.message?.includes('fetch')
      ) {
        throw new Error(
          'Network error: Could not connect to snap. Please check your snap connection.'
        );
      }

      if (error instanceof Error) {
        throw new Error(`MetaMask Snap signing failed: ${error.message}`);
      }
      throw error;
    }
  }
}
