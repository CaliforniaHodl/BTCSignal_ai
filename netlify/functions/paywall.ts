import { Handler } from '@netlify/functions';
import { LNbitsPaywall } from './lib/lnbits-paywall';

const PAYWALL_AMOUNT = 21; // sats per post

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, postId, paymentHash } = body;

    const paywall = new LNbitsPaywall();

    if (action === 'create-invoice') {
      // Create invoice for accessing a post
      if (!postId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'postId required' }),
        };
      }

      const invoice = await paywall.createInvoice(
        PAYWALL_AMOUNT,
        `BTC Signal AI - Analysis Access: ${postId}`
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          payment_hash: invoice.payment_hash,
          payment_request: invoice.payment_request,
          amount: PAYWALL_AMOUNT,
        }),
      };
    }

    if (action === 'check-payment') {
      // Check if invoice was paid
      if (!paymentHash) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'paymentHash required' }),
        };
      }

      const status = await paywall.checkPayment(paymentHash);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          paid: status.paid,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action. Use create-invoice or check-payment' }),
    };

  } catch (error) {
    console.error('Paywall error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Paywall error',
      }),
    };
  }
};

export { handler };
