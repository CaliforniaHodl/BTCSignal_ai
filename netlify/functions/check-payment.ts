import type { Context } from '@netlify/functions';

// LNbits configuration
const LNBITS_URL = process.env.LNBITS_URL || 'https://legend.lnbits.com';
const LNBITS_API_KEY = process.env.LNBITS_API_KEY || '';

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { payment_hash } = await req.json();

    if (!payment_hash) {
      return new Response(JSON.stringify({ error: 'Missing payment_hash' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check payment status via LNbits
    const response = await fetch(`${LNBITS_URL}/api/v1/payments/${payment_hash}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': LNBITS_API_KEY
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ paid: false, error: 'Payment not found' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const paymentData = await response.json();

    // LNbits returns 'paid' boolean
    const isPaid = paymentData.paid === true;

    return new Response(JSON.stringify({
      paid: isPaid,
      payment_hash,
      details: isPaid ? {
        amount: paymentData.amount,
        time: paymentData.time
      } : null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Check payment error:', error);
    return new Response(JSON.stringify({ paid: false, error: 'Failed to check payment' }), {
      status: 200, // Return 200 so client keeps polling
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
