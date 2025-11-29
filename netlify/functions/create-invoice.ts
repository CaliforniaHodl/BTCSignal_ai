import type { Context } from '@netlify/functions';

// LNbits configuration
const LNBITS_URL = process.env.LNBITS_URL || 'https://legend.lnbits.com';
const LNBITS_API_KEY = process.env.LNBITS_API_KEY || '';

interface InvoiceRequest {
  tier: 'single' | 'hourly' | 'daily' | 'weekly';
  amount: number;
  postId?: string; // For single post purchases
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body: InvoiceRequest = await req.json();
    const { tier, amount, postId } = body;

    // Validate tier and amount
    const validTiers: Record<string, number> = {
      single: 21,
      hourly: 1000,
      daily: 20000,
      weekly: 100000
    };

    if (!validTiers[tier] || validTiers[tier] !== amount) {
      return new Response(JSON.stringify({ error: 'Invalid tier or amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create memo based on tier
    const memos: Record<string, string> = {
      single: 'BTC Signal AI - Single Post',
      hourly: 'BTC Signal AI - 1 Hour Pass',
      daily: 'BTC Signal AI - Day Pass',
      weekly: 'BTC Signal AI - Week Pass'
    };

    // Create invoice via LNbits
    const invoiceResponse = await fetch(`${LNBITS_URL}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': LNBITS_API_KEY
      },
      body: JSON.stringify({
        out: false,
        amount: amount,
        memo: memos[tier],
        expiry: 600 // 10 minutes
      })
    });

    if (!invoiceResponse.ok) {
      const error = await invoiceResponse.text();
      console.error('LNbits error:', error);
      throw new Error('Failed to create invoice');
    }

    const invoiceData = await invoiceResponse.json();

    // Generate QR code URL (using a public QR service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoiceData.payment_request)}`;

    return new Response(JSON.stringify({
      payment_request: invoiceData.payment_request,
      payment_hash: invoiceData.payment_hash,
      qr_code: qrCodeUrl,
      tier,
      amount,
      expires_at: Date.now() + 600000 // 10 minutes
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Create invoice error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create invoice' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
