import { NetworkName } from "@arkade-os/sdk";
import { XOnlyPubKeyHex } from "./types";

/**
 * Validation utilities
 */
const VALID_NETWORKS: NetworkName[] = ['bitcoin', 'testnet', 'signet', 'mutinynet', 'regtest'];

function isValidNetwork(network: unknown): network is NetworkName {
  return typeof network === 'string' && VALID_NETWORKS.includes(network as NetworkName);
}

function isValidHex(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value);
}

function validateNetwork(network: unknown): NetworkName {
  if (typeof network !== 'string') {
    throw new Error(`Invalid network type: expected string, got ${typeof network}`);
  }
  if (!isValidNetwork(network)) {
    throw new Error(`Invalid network: ${network}. Must be one of: ${VALID_NETWORKS.join(', ')}`);
  }
  return network;
}

function validateSignerPubkey(signerPubkey: unknown): XOnlyPubKeyHex {
  if (typeof signerPubkey !== 'string') {
    throw new Error(`Invalid signerPubkey type: expected string, got ${typeof signerPubkey}`);
  }
  if (signerPubkey.length === 0) {
    throw new Error('signerPubkey cannot be empty');
  }
  if (!isValidHex(signerPubkey)) {
    throw new Error(`Invalid signerPubkey: must be a valid hex string`);
  }
  // Must be x-only pubkey (32 bytes = 64 hex chars)
  if (signerPubkey.length !== 64) {
    throw new Error(`Invalid signerPubkey length: expected 64 hex characters (x-only public key), got ${signerPubkey.length}`);
  }
  return signerPubkey;
}

function validatePsbt(psbt: unknown): string {
  if (typeof psbt !== 'string') {
    throw new Error(`Invalid psbt type: expected string, got ${typeof psbt}`);
  }
  if (psbt.length === 0) {
    throw new Error('PSBT cannot be empty');
  }
  // Validate base64 format
  if (!/^[A-Za-z0-9+/=]+$/.test(psbt)) {
    throw new Error('Invalid PSBT: must be a valid base64 string');
  }
  return psbt;
}

function validateInputIndexes(inputIndexes: unknown): number[] {
  if (!Array.isArray(inputIndexes)) {
    throw new Error(`Invalid inputIndexes type: expected array, got ${typeof inputIndexes}`);
  }
  if (inputIndexes.length === 0) {
    throw new Error('inputIndexes cannot be empty');
  }
  for (let i = 0; i < inputIndexes.length; i++) {
    const idx = inputIndexes[i];
    if (typeof idx !== 'number') {
      throw new Error(`Invalid inputIndexes[${i}]: expected number, got ${typeof idx}`);
    }
    if (!Number.isInteger(idx)) {
      throw new Error(`Invalid inputIndexes[${i}]: must be an integer, got ${idx}`);
    }
    if (idx < 0) {
      throw new Error(`Invalid inputIndexes[${i}]: must be non-negative, got ${idx}`);
    }
  }
  return inputIndexes;
}

function validateUnilateralExitDelay(delay: unknown): bigint {
  if (typeof delay !== 'string' && typeof delay !== 'number' && typeof delay !== 'bigint') {
    throw new Error(`Invalid unilateralExitDelay type: expected string, number, or bigint, got ${typeof delay}`);
  }

  let delayBigInt: bigint;
  try {
    delayBigInt = BigInt(delay);
  } catch (error) {
    throw new Error(`Invalid unilateralExitDelay: ${delay} is not a valid number`);
  }

  if (delayBigInt < 0n) {
    throw new Error(`Invalid unilateralExitDelay: must be non-negative, got ${delayBigInt}`);
  }

  return delayBigInt;
}

export {
  validateInputIndexes,
  validateNetwork,
  validatePsbt,
  validateSignerPubkey,
  validateUnilateralExitDelay,
  isValidHex,
  isValidNetwork,
}