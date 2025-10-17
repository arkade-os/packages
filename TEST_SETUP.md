# Test Setup Summary

This document describes the testing infrastructure added to the Arkade Snap project.

## Overview

Added **contract testing** for the snap's RPC interface using Vitest. These tests validate the RPC contract (interface between snap and dapps) without testing SDK implementation details.

## What Was Added

### 1. Test Configuration

**File:** [packages/snap/vitest.config.ts](packages/snap/vitest.config.ts)
- Vitest configuration for Node.js environment
- Coverage reporting enabled (v8 provider)
- Test pattern: `src/**/*.test.ts`

**Updated:** [packages/snap/package.json](packages/snap/package.json)
- Added `vitest` and `@vitest/ui` dev dependencies
- New scripts:
  - `pnpm test` - Run tests once
  - `pnpm test:watch` - Watch mode
  - `pnpm test:ui` - Interactive UI
  - `pnpm test:coverage` - Coverage report

### 2. Test Files

#### [packages/snap/src/index.test.ts](packages/snap/src/index.test.ts) (27 tests)
Tests all 3 RPC methods with JSON-RPC 2.0 compliant requests:

**`arkade_getPublicKey`** (3 tests)
- ✅ Returns correct structure (compressedPublicKey, xOnlyPublicKey)
- ✅ Returns valid hex strings (66 and 64 chars)
- ✅ Works without parameters

**`arkade_getAddress`** (10 tests)
- ✅ Returns correct structure (address field)
- ✅ Returns `ark` prefix for bitcoin network
- ✅ Returns `tark` prefix for testnet/signet
- ✅ Validates network parameter (type, value)
- ✅ Validates signerPubkey (type, format, length)
- ✅ Validates unilateralExitDelay (type, numeric)
- ✅ Accepts string/number for unilateralExitDelay

**`arkade_signPsbt`** (12 tests)
- ✅ Returns correct structure (psbt field)
- ✅ Returns valid base64 PSBT
- ✅ Validates psbt parameter (type, format, empty)
- ✅ Validates inputIndexes (type, array, empty, integers, non-negative)
- ✅ Accepts multiple inputIndexes

**Unknown methods** (2 tests)
- ✅ Throws error for unsupported methods
- ✅ Throws error for empty method name

#### [packages/snap/src/utils.test.ts](packages/snap/src/utils.test.ts) (33 tests)
Tests all validation utilities:
- `isValidHex()` - hex string validation
- `isValidNetwork()` - network name validation
- `validateNetwork()` - network with error handling
- `validateSignerPubkey()` - x-only pubkey validation
- `validatePsbt()` - base64 PSBT validation
- `validateInputIndexes()` - array validation
- `validateUnilateralExitDelay()` - bigint validation

#### [packages/snap/src/__mocks__/wallet.ts](packages/snap/src/__mocks__/wallet.ts)
Mock implementations of wallet functions that:
- ✅ Use **real validation** from `utils.ts`
- ✅ Return **mock data** to avoid SDK dependencies
- ✅ Enable **fast, isolated tests**

### 3. CI Workflow

**File:** [.github/workflows/test.yml](.github/workflows/test.yml)

Runs on:
- Push to `master`, `main`, `develop` branches
- Pull requests to these branches

Steps:
1. Checkout code
2. Setup pnpm (v9) and Node.js (v20)
3. Install dependencies
4. Run snap tests (`pnpm --filter arkade-snap test`)
5. Run linter (`pnpm --filter arkade-snap lint`)

## Test Philosophy

### What IS Tested
✅ **RPC Contract** - Request/response schemas for all 3 methods
✅ **Input Validation** - Parameter type checking and error messages
✅ **Edge Cases** - Empty values, invalid types, boundary conditions
✅ **Error Handling** - Proper error messages for invalid inputs

### What is NOT Tested
❌ **SDK Implementation** - That's the SDK's responsibility
❌ **Blockchain Operations** - No actual Bitcoin/Ark transactions
❌ **MetaMask Runtime** - Not testing snap execution environment
❌ **Network Calls** - No external dependencies

## Running Tests

```bash
# From project root
pnpm --filter arkade-snap test

# From snap directory
cd packages/snap
pnpm test

# Watch mode
pnpm test:watch

# Interactive UI
pnpm test:ui

# With coverage
pnpm test:coverage
```

## Test Results

**Current Status:**
- ✅ 60 tests passing
- ✅ 2 test files
- ⚡ ~250ms execution time
- 📊 Coverage reporting available

## Benefits

1. **Fast** - Tests run in <1 second
2. **Reliable** - No flaky network/blockchain dependencies
3. **Contract-focused** - Tests the interface, not implementation
4. **CI-integrated** - Automatic validation on every PR
5. **Documentation** - Tests serve as executable API documentation

## Future Enhancements

Potential additions (not implemented):
- Integration tests with real SDK (slower, separate test suite)
- Snapshot testing for PSBT structures
- Performance benchmarks for signing operations
- E2E tests with MetaMask Flask

## Documentation

- **Detailed test documentation:** [packages/snap/src/__tests__/README.md](packages/snap/src/__tests__/README.md)
- **Project instructions:** [CLAUDE.md](CLAUDE.md#testing-requirements)
