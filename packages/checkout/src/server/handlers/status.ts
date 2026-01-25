import { NextRequest, NextResponse } from 'next/server';

export async function handleStatus(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')!;

  const checkout = await getCheckout(id);
  if (!checkout) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(checkout);
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
