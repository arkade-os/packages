# Snap Tests

This directory contains contract tests for the Arkade Snap RPC interface.

## Overview

These tests validate the **RPC contract** - the interface between the snap and dapps. They ensure:
- Request/response schemas are correct
- Input validation works properly
- Error handling is consistent
- All 3 RPC methods behave as documented

## Test Strategy

**Focus**: Contract testing (interface validation)
**Not tested**: SDK integration, actual blockchain operations

### Mocking Approach

The tests use mocked wallet functions ([`__mocks__/wallet.ts`](../__mocks__/wallet.ts)) that:
- ✅ Use **real validation** from `utils.ts`
- ✅ Return **mock data** to avoid SDK dependencies
- ✅ Test the **contract**, not the implementation

This ensures tests are:
- **Fast** (<1 second runtime)
- **Reliable** (no external dependencies)
- **Focused** (test interface, not SDK)
- **CI-friendly** (no network calls)

## Test Files

### [`index.test.ts`](../index.test.ts)
Tests all 3 RPC methods:

**`arkade_getPublicKey`**
- Returns correct structure (compressedPublicKey, xOnlyPublicKey)
- Returns valid hex strings (66 and 64 chars)
- Requires no parameters

**`arkade_getAddress`**
- Validates all required params (network, signerPubkey, unilateralExitDelay)
- Rejects invalid network names
- Validates signerPubkey format (64 hex chars)
- Returns correct address prefix (ark/tark)

**`arkade_signPsbt`**
- Validates all required params (psbt, inputIndexes)
- Validates base64 PSBT format
- Validates inputIndexes array (non-negative integers)
- Returns signed PSBT

**Unknown methods**
- Returns proper error for unsupported methods

### [`utils.test.ts`](../utils.test.ts)
Tests all validation utilities:
- `isValidHex()` - hex string validation
- `isValidNetwork()` - network name validation
- `validateNetwork()` - network validation with errors
- `validateSignerPubkey()` - x-only pubkey validation
- `validatePsbt()` - base64 PSBT validation
- `validateInputIndexes()` - array of input indexes validation
- `validateUnilateralExitDelay()` - bigint delay validation

## Running Tests

```bash
# Run tests once
pnpm test

# Watch mode (re-run on changes)
pnpm test:watch

# UI mode (interactive browser UI)
pnpm test:ui

# Coverage report
pnpm test:coverage
```

## CI Integration

Tests run automatically on:
- Push to `master`, `main`, or `develop` branches
- Pull requests to these branches

See [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)

## What's NOT Tested

These tests intentionally **do not** test:
- Actual SDK behavior (that's the SDK's responsibility)
- Blockchain interactions
- MetaMask snap runtime
- Network connectivity
- Real PSBT signing

For integration testing with the actual SDK, use the manual testing flow described in [`CLAUDE.md`](../../../CLAUDE.md#testing-requirements).
