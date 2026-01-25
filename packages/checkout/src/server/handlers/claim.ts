import { NextRequest, NextResponse } from 'next/server';
import { Wallet } from '@arkade-os/sdk';
import { ArkadeLightning, BoltzSwapProvider } from '@arkade-os/boltz-swap';
import { getCachedPrivateKey } from '../vss';

export const maxDuration = 300; // 5 minutes

export async function handleClaim(request: NextRequest) {
  const { checkoutId } = await request.json();

  const checkout = await getCheckout(checkoutId);
  if (!checkout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Get private key from VSS
  const identity = await getCachedPrivateKey();
  const wallet = await Wallet.create({
    identity,
    arkServerUrl: process.env.ARKADE_SERVER_URL || 'https://arkade.computer',
  });

  const swapProvider = new BoltzSwapProvider({
    apiUrl: process.env.BOLTZ_API_URL || 'https://api.ark.boltz.exchange',
    network: (process.env.ARKADE_NETWORK as any) || 'bitcoin',
  });

  const arkadeLightning = new ArkadeLightning({
    wallet,
    swapProvider,
  });

  try {
    const result = await arkadeLightning.waitAndClaim(checkout.pendingSwap);

    // Update checkout status
    await updateCheckout(checkoutId, {
      status: 'paid',
      txid: result.txid,
      paidAt: Date.now(),
    });

    return NextResponse.json({ status: 'paid', txid: result.txid });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function getCheckout(id: string) {
  if (process.env.KV_REST_API_URL) {
    const kv = require('@vercel/kv');
    const data = await kv.get(`checkout:${id}`);
    return data ? JSON.parse(data as string) : null;
  } else {
    return (global as any).checkoutStore?.get(id) || null;
  }
}

async function updateCheckout(id: string, updates: any) {
  const checkout = await getCheckout(id);
  const updated = { ...checkout, ...updates };

  if (process.env.KV_REST_API_URL) {
    const kv = require('@vercel/kv');
    await kv.set(`checkout:${id}`, JSON.stringify(updated), { ex: 3600 });
  } else {
    (global as any).checkoutStore.set(id, updated);
  }
}
