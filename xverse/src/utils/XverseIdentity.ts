import { base64, hex } from '@scure/base';
import { type SignerSession, Transaction } from '@arkade-os/sdk';
import type { AddressPurpose } from 'sats-connect';

/**
 * Xverse wallet identity implementation for Bitcoin signing via Sats Connect.
 * Provides the same interface as other Identity providers but uses Xverse wallet.
 *
 * This allows the Arkade SDK Wallet to run entirely in the dapp while
 * delegating signing operations to the Xverse wallet via Sats Connect.
 */
export class XverseIdentity {
  publicKey: Uint8Array;
  address: string;
  paymentAddress: string; // P2WPKH address for signing
  ordinalsAddress?: string; // Optional ordinals address

  constructor(
    publicKeyHex: string,
    address: string,
    paymentAddress: string,
    ordinalsAddress?: string
  ) {
    if (publicKeyHex.length !== 66) {
      throw new Error('compressed public key must be 33-bytes (66 hex chars)');
    }
    this.publicKey = hex.decode(publicKeyHex);
    this.address = address;
    this.paymentAddress = paymentAddress;
    this.ordinalsAddress = ordinalsAddress;
  }

  /**
   * Get x-only public key (32 bytes, no prefix)
   * Required by Identity interface - must be async
   */
  async xOnlyPublicKey(): Promise<Uint8Array> {
    const fullPubkey = this.publicKey;
    return fullPubkey.slice(1);
  }

  /**
   * Get compressed public key (33 bytes with prefix)
   * Required by Identity interface
   */
  async compressedPublicKey(): Promise<Uint8Array> {
    return this.publicKey;
  }

  /**
   * Get signer session for MuSig2 signing
   * Required by Identity interface for collaborative signing with Arkade server
   *
   * Note: MuSig2 signing is not yet supported by Xverse wallet.
   * This returns a stub that throws only if methods are called.
   */
  signerSession(): SignerSession {
    return {
      async getPublicKey(): Promise<Uint8Array> {
        throw new Error('MuSig2 getPublicKey is not supported by Xverse wallet');
      },
      async init(): Promise<void> {
        throw new Error('MuSig2 init is not supported by Xverse wallet');
      },
      async getNonces(): Promise<any> {
        throw new Error('MuSig2 getNonces is not supported by Xverse wallet');
      },
      async aggregatedNonces(): Promise<{ hasAllNonces: boolean }> {
        throw new Error('MuSig2 aggregatedNonces is not supported by Xverse wallet');
      },
      async sign(): Promise<any> {
        throw new Error('MuSig2 sign is not supported by Xverse wallet');
      }
    };
  }

  /**
   * Sign a message with the private key
   * Required by Identity interface
   *
   * @param _message - The message to sign (unused, marked with _ prefix)
   * @param signatureType - Either "schnorr" or "ecdsa"
   * @returns The signature as a Uint8Array
   */
  async signMessage(
    _message: Uint8Array,
    signatureType: 'schnorr' | 'ecdsa' = 'schnorr'
  ): Promise<Uint8Array> {
    // TODO: Implement using Sats Connect signMessage method
    // https://docs.xverse.app/sats-connect/bitcoin-methods/signmessage
    throw new Error(
      `Message signing (${signatureType}) is not yet implemented for Xverse wallet. ` +
      'This feature requires implementing the signMessage method from Sats Connect.'
    );
  }

  /**
   * Get the Bitcoin address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Check if Xverse wallet is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      // Check if Sats Connect is available
      if (typeof window === 'undefined' || !(window as any).SatsConnectNamespace) {
        return false;
      }

      // Wallet is connected if we have an address
      return Boolean(this.address && this.paymentAddress);
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  /**
   * Reconnect to Xverse wallet
   * For Xverse, this would trigger a new wallet connection request
   */
  async reconnect(): Promise<boolean> {
    try {
      // Import dynamically to avoid build errors
      const { request } = await import('sats-connect');

      const response = await request('getAccounts', {
        purposes: ['payment', 'ordinals'] as AddressPurpose[],
        message: 'Reconnect to Arkade wallet',
      });

      if (response.status === 'success' && response.result.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }

  /**
   * Sign a transaction using Xverse wallet via Sats Connect
   *
   * @param tx - The transaction to sign
   * @param inputIndexes - Optional array of input indexes to sign. If null, signs all inputs.
   * @returns The signed transaction
   */
  async sign(tx: Transaction, inputIndexes: number[] | null = null): Promise<Transaction> {
    console.log('XverseIdentity.sign called with:', {
      inputIndexes,
      txInputsLength: tx.inputsLength,
      address: this.address,
      paymentAddress: this.paymentAddress,
    });

    try {
      // Check connection
      const isConnected = await this.isConnected();
      if (!isConnected) {
        const reconnected = await this.reconnect();
        if (!reconnected) {
          throw new Error('Xverse wallet not connected');
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

      // Import Sats Connect dynamically
      const { request } = await import('sats-connect');

      // Build signInputs object mapping address to input indexes
      // Sats Connect expects: { "address": [inputIndex1, inputIndex2] }
      const signInputsMap: Record<string, number[]> = {
        [this.paymentAddress]: signInputs,
      };

      console.log('Calling Xverse signPsbt with:', {
        psbtBase64Length: psbtBase64.length,
        signInputsMap,
      });

      // Call Xverse wallet to sign PSBT via Sats Connect
      const response = await request('signPsbt', {
        psbt: psbtBase64,
        signInputs: signInputsMap,
        broadcast: false, // Don't broadcast - let Arkade SDK handle that
      });

      if (response.status === 'success' && response.result.psbt) {
        const signedPsbtBytes = base64.decode(response.result.psbt);
        const signedTx = Transaction.fromPSBT(signedPsbtBytes, { allowUnknown: true });
        console.log('Successfully created signed transaction');
        return signedTx;
      } else {
        throw new Error(
          `Xverse signing failed: ${response.status === 'error' ? response.error.message : 'Unknown error'}`
        );
      }
    } catch (error: any) {
      console.error('Xverse signing failed:', error);

      // Handle user rejection
      if (error.message?.includes('User rejected') || error.message?.includes('denied')) {
        throw new Error('User rejected the signing request');
      }

      if (error instanceof Error) {
        throw new Error(`Xverse wallet signing failed: ${error.message}`);
      }
      throw error;
    }
  }
}
