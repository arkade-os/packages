import { Identity, Transaction } from '@arkade-os/sdk';

/**
 * A single PSBT signing request within a batch.
 * Mirrors the SignRequest type from @arkade-os/sdk (>=0.4.15).
 * TODO: Import from SDK once the BatchSignableIdentity PR is published.
 */
export interface SignRequest {
  tx: Transaction;
  inputIndexes?: number[];
}

/**
 * Identity that supports signing multiple PSBTs in a single wallet interaction.
 * Mirrors the BatchSignableIdentity type from @arkade-os/sdk (>=0.4.15).
 * TODO: Import from SDK once the BatchSignableIdentity PR is published.
 */
export interface BatchSignableIdentity extends Identity {
  signMultiple(requests: SignRequest[]): Promise<Transaction[]>;
}

/**
 * Window type declarations for browser wallet extensions.
 * These are injected by the respective browser extensions at runtime.
 */

export interface UnisatProvider {
  requestAccounts(): Promise<string[]>;
  getPublicKey(): Promise<string>;
  signPsbt(psbtHex: string, options?: UnisatSignOptions): Promise<string>;
  signPsbts(psbtHexs: string[], options?: UnisatSignOptions[]): Promise<string[]>;
  signMessage(message: string): Promise<string>;
  getNetwork(): Promise<string>;
}

export interface UnisatSignOptions {
  autoFinalized?: boolean;
  toSignInputs?: Array<{
    index: number;
    address?: string;
    publicKey?: string;
    sighashTypes?: number[];
  }>;
}

export interface OkxBitcoinProvider {
  connect(): Promise<{ address: string; publicKey: string }>;
  signPsbt(psbtHex: string, options?: OkxSignOptions): Promise<string>;
  signPsbts(psbtHexs: string[], options?: OkxSignOptions[]): Promise<string[]>;
  signMessage(message: string, type?: 'ecdsa' | 'bip322-simple'): Promise<string>;
}

export interface OkxSignOptions {
  autoFinalized?: boolean;
  toSignInputs?: Array<{
    index: number;
    address?: string;
    publicKey?: string;
    sighashTypes?: number[];
  }>;
}

export interface LeatherProvider {
  request(method: string, params?: Record<string, unknown>): Promise<LeatherResponse>;
}

export interface LeatherResponse {
  result?: any;
  error?: { code: number; message: string };
}

export interface PhantomBitcoinProvider {
  requestAccounts(): Promise<Array<{ address: string; addressType: string; publicKey: string }>>;
  signPSBT(psbt: Uint8Array, options?: PhantomSignOptions): Promise<Uint8Array>;
  signMessage(address: string, message: Uint8Array): Promise<{ signature: Uint8Array }>;
}

export interface PhantomSignOptions {
  inputsToSign?: Array<{
    sigHash?: number;
    address: string;
    signingIndexes: number[];
  }>;
}

declare global {
  interface Window {
    unisat?: UnisatProvider;
    okxwallet?: { bitcoin?: OkxBitcoinProvider };
    LeatherProvider?: LeatherProvider;
    phantom?: { bitcoin?: PhantomBitcoinProvider };
  }
}
