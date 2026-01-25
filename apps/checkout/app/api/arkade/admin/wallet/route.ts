import { NextRequest, NextResponse } from 'next/server';
import { Wallet, SingleKey } from '@arkade-os/sdk';

export async function POST(request: NextRequest) {
  try {
    const { privateKeyHex } = await request.json();

    if (!privateKeyHex) {
      return NextResponse.json(
        { error: 'Private key is required' },
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

    // Get wallet address
    const address = await wallet.getAddress();

    // Get balance
    const balance = await wallet.getBalance();

    // Get transaction history
    const history = await wallet.getTransactionHistory();

    return NextResponse.json({
      wallet: {
        address,
        balance: {
          total: balance.total,
          available: balance.available,
          settled: balance.settled,
          preconfirmed: balance.preconfirmed,
          recoverable: balance.recoverable,
          boarding: {
            total: balance.boarding.total,
          },
        },
      },
      history: history.map((tx: any) => ({
        txid: tx.txid || tx.id || 'unknown',
        amount: tx.amount || 0,
        type: tx.type || 'unknown',
        timestamp: tx.timestamp || tx.createdAt || Date.now(),
      })),
    });
  } catch (error) {
    console.error('Error loading wallet:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load wallet',
        details: error && typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : undefined
      },
      { status: 500 }
    );
  }
}
