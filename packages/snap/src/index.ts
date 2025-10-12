import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, heading, copyable, divider } from '@metamask/snaps-sdk';
import { createWallet, getWalletInfo, sendBitcoin, getBalance, getTransactionHistory, payLightningInvoice, createLightningInvoice, resetWallet, startIncomingFundsMonitoring } from './wallet';

/**
 * Handle incoming JSON-RPC requests from dapps.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of the request.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  console.log('Received request:', request.method, 'from:', origin);

  switch (request.method) {
    case 'arkade_getWallet':
      return await handleGetWallet();

    case 'arkade_createWallet':
      return await handleCreateWallet(request.params);

    case 'arkade_importWallet':
      return await handleImportWallet(request.params);

    case 'arkade_getBalance':
      return await handleGetBalance();

    case 'arkade_send':
      return await handleSend(request.params);

    case 'arkade_getTransactionHistory':
      return await handleGetTransactionHistory();

    case 'arkade_payLightningInvoice':
      return await handlePayLightningInvoice(request.params);

    case 'arkade_createLightningInvoice':
      return await handleCreateLightningInvoice(request.params);

    case 'arkade_resetWallet':
      return await handleResetWallet();

    case 'arkade_startMonitoring':
      return await handleStartMonitoring();

    default:
      throw new Error(`Method not found: ${request.method}`);
  }
};

/**
 * Get current wallet info.
 */
async function handleGetWallet() {
  try {
    const walletInfo = await getWalletInfo();

    if (!walletInfo) {
      return {
        success: false,
        message: 'No wallet found. Please create or import a wallet first.',
      };
    }

    return {
      success: true,
      data: walletInfo,
    };
  } catch (error) {
    console.error('Error getting wallet:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new Arkade wallet.
 */
async function handleCreateWallet(params: any) {
  try {
    const { network = 'testnet' } = params || {};

    const confirmed = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Create Arkade Wallet'),
          text('This will create a new Bitcoin wallet with Ark protocol support.'),
          divider(),
          text('Your wallet will support:'),
          text('• Bitcoin on-chain transactions'),
          text('• Instant off-chain transfers via Ark VTXOs'),
          text('• Lightning Network payments'),
          text('• Tether (USDT) assets'),
          divider(),
          text('⚠️ Make sure to backup your recovery phrase!'),
        ]),
      },
    });

    if (!confirmed) {
      return {
        success: false,
        message: 'User rejected wallet creation',
      };
    }

    const wallet = await createWallet(network);

    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          heading('Wallet Created Successfully'),
          divider(),
          text('**Ark Address:**'),
          copyable(wallet.arkAddress),
          divider(),
          text('**Boarding Address:**'),
          copyable(wallet.boardingAddress),
          divider(),
          text('⚠️ Important: Save your recovery phrase securely!'),
          text('You will need it to restore your wallet.'),
        ]),
      },
    });

    return {
      success: true,
      data: wallet,
    };
  } catch (error) {
    console.error('Error creating wallet:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import an existing wallet from mnemonic or private key.
 */
async function handleImportWallet(params: any) {
  try {
    const { mnemonic, privateKey, network = 'testnet' } = params || {};

    if (!mnemonic && !privateKey) {
      return {
        success: false,
        message: 'Please provide either a mnemonic or private key',
      };
    }

    const confirmed = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Import Arkade Wallet'),
          text('This will import your existing Bitcoin wallet.'),
          divider(),
          text('⚠️ Make sure you trust the source of this recovery phrase!'),
        ]),
      },
    });

    if (!confirmed) {
      return {
        success: false,
        message: 'User rejected wallet import',
      };
    }

    // TODO: Implement wallet import logic
    return {
      success: false,
      message: 'Wallet import not yet implemented',
    };
  } catch (error) {
    console.error('Error importing wallet:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get wallet balance.
 */
async function handleGetBalance() {
  try {
    const balance = await getBalance();

    return {
      success: true,
      data: balance,
    };
  } catch (error) {
    console.error('Error getting balance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Bitcoin via Ark protocol.
 */
async function handleSend(params: any) {
  try {
    const { to, amount, asset = 'btc' } = params || {};

    if (!to || !amount) {
      return {
        success: false,
        message: 'Please provide recipient address and amount',
      };
    }

    const confirmed = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Send Bitcoin'),
          divider(),
          text(`**To:**`),
          copyable(to),
          divider(),
          text(`**Amount:** ${amount} ${asset.toUpperCase()}`),
          divider(),
          text('This transaction will be sent via the Ark protocol for instant settlement.'),
        ]),
      },
    });

    if (!confirmed) {
      return {
        success: false,
        message: 'User rejected transaction',
      };
    }

    const txId = await sendBitcoin(to, amount);

    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          heading('Transaction Sent'),
          divider(),
          text('**Transaction ID:**'),
          copyable(txId),
          divider(),
          text('✅ Your transaction has been sent successfully!'),
        ]),
      },
    });

    return {
      success: true,
      data: { txId },
    };
  } catch (error) {
    console.error('Error sending transaction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get transaction history.
 */
async function handleGetTransactionHistory() {
  try {
    const history = await getTransactionHistory();

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pay a Lightning Network invoice.
 */
async function handlePayLightningInvoice(params: any) {
  try {
    const { invoice, maxFeeSats } = params || {};

    if (!invoice) {
      return {
        success: false,
        message: 'Please provide a Lightning invoice',
      };
    }

    const confirmed = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Pay Lightning Invoice'),
          divider(),
          text('**Invoice:**'),
          copyable(invoice),
          divider(),
          text('This will pay the Lightning invoice using your Ark VTXOs via submarine swap.'),
          text(`Max fee: ${maxFeeSats || 5000} sats`),
        ]),
      },
    });

    if (!confirmed) {
      return {
        success: false,
        message: 'User rejected payment',
      };
    }

    const result = await payLightningInvoice(invoice, maxFeeSats);

    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          heading('Lightning Payment Sent'),
          divider(),
          text('**Transaction ID:**'),
          copyable(result.txid),
          divider(),
          text('**Preimage:**'),
          copyable(result.preimage),
          divider(),
          text(`**Amount:** ${result.amount} sats`),
          divider(),
          text('✅ Your Lightning payment has been sent successfully!'),
        ]),
      },
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error paying Lightning invoice:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a Lightning invoice to receive funds.
 */
async function handleCreateLightningInvoice(params: any) {
  try {
    const { amount, description } = params || {};

    if (!amount || amount <= 0) {
      return {
        success: false,
        message: 'Please provide a valid amount',
      };
    }

    const confirmed = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Create Lightning Invoice'),
          divider(),
          text(`**Amount:** ${amount} sats`),
          text(`**Description:** ${description || 'Arkade wallet payment'}`),
          divider(),
          text('This will create a Lightning invoice that deposits to your Arkade wallet via reverse swap.'),
        ]),
      },
    });

    if (!confirmed) {
      return {
        success: false,
        message: 'User rejected invoice creation',
      };
    }

    const result = await createLightningInvoice(amount, description);

    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          heading('Lightning Invoice Created'),
          divider(),
          text('**Invoice:**'),
          copyable(result.invoice),
          divider(),
          text('**Payment Hash:**'),
          copyable(result.paymentHash),
          divider(),
          text(`**Amount:** ${result.amount} sats`),
          text(`**Expires in:** ${result.expiry} seconds`),
          divider(),
          text('✅ Share this invoice to receive payment!'),
          text('Funds will automatically appear in your Arkade wallet when paid.'),
        ]),
      },
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error creating Lightning invoice:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset wallet (clear all stored data).
 */
async function handleResetWallet() {
  try {
    const confirmed = await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Reset Wallet'),
          divider(),
          text('⚠️ WARNING: This will permanently delete your wallet data!'),
          divider(),
          text('• Your private key will be deleted'),
          text('• All wallet data will be lost'),
          text('• This action cannot be undone'),
          divider(),
          text('Make sure you have:'),
          text('✓ Backed up your recovery phrase'),
          text('✓ Withdrawn all funds'),
          divider(),
          text('Are you sure you want to reset your wallet?'),
        ]),
      },
    });

    if (!confirmed) {
      return {
        success: false,
        message: 'User cancelled wallet reset',
      };
    }

    await resetWallet();

    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          heading('Wallet Reset Complete'),
          divider(),
          text('✅ Your wallet has been reset successfully.'),
          text('You can now create a new wallet or import an existing one.'),
        ]),
      },
    });

    return {
      success: true,
      message: 'Wallet reset successfully',
    };
  } catch (error) {
    console.error('Error resetting wallet:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start monitoring for incoming funds.
 */
async function handleStartMonitoring() {
  try {
    console.log('Starting incoming funds monitoring from snap...');

    // Start monitoring - this runs in the background
    // We don't store the stop function as it's not JSON-serializable
    // The monitoring will run as long as the snap is active
    const stopFn = await startIncomingFundsMonitoring();

    // Note: We can't return or store the stop function in MetaMask state
    // as functions are not JSON-serializable. The monitoring will stop
    // when the snap is reloaded or the wallet is reset.

    console.log('Monitoring started, stop function available but not stored');

    return {
      success: true,
      message: 'Incoming funds monitoring started',
    };
  } catch (error) {
    console.error('Error starting monitoring:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
