import { NextRequest, NextResponse } from 'next/server';
import { Wallet, SingleKey } from '@arkade-os/sdk';

export async function POST(request: NextRequest) {
  try {
    const { privateKeyHex, address, amount } = await request.json();

    if (!privateKeyHex || !address || !amount) {
      return NextResponse.json(
        { error: 'Private key, address, and amount are required' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountSats = parseInt(amount);
    if (isNaN(amountSats) || amountSats <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Create identity from private key
    const identity = SingleKey.fromHex(privateKeyHex);

    // Create wallet
    const wallet = await Wallet.create({
      identity,
      arkServerUrl: process.env.ARKADE_SERVER_URL || 'https://arkade.computer',
    });

    // Check balance
    const balance = await wallet.getBalance();
    if (balance.available < amountSats) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${balance.available} sats` },
        { status: 400 }
      );
    }

    // Send bitcoin
    const txid = await wallet.sendBitcoin({
      address,
      amount: amountSats,
    });

    return NextResponse.json({
      success: true,
      txid,
      amount: amountSats,
      address,
    });
  } catch (error) {
    console.error('Error processing payout:', error);

    // Print full error details for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Payout failed',
        details: error && typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : undefined
      },
      { status: 500 }
    );
  }
}
