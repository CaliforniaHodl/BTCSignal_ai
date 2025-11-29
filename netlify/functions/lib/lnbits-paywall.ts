// LNbits Paywall Integration
// Connects to your self-hosted LNbits on MyNode

interface CreateInvoiceResponse {
  payment_hash: string;
  payment_request: string; // BOLT11 invoice
}

interface CheckPaymentResponse {
  paid: boolean;
}

export class LNbitsPaywall {
  private endpoint: string;
  private adminKey: string;
  private invoiceKey: string;

  constructor() {
    this.endpoint = process.env.LNBITS_ENDPOINT || '';
    this.adminKey = process.env.LNBITS_ADMIN_KEY || '';
    this.invoiceKey = process.env.LNBITS_INVOICE_KEY || '';
  }

  // Create a Lightning invoice for paywall access
  async createInvoice(amount: number, memo: string): Promise<CreateInvoiceResponse> {
    if (!this.endpoint || !this.adminKey) {
      throw new Error('LNbits not configured. Set LNBITS_ENDPOINT and LNBITS_ADMIN_KEY');
    }

    const response = await fetch(`${this.endpoint}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.adminKey,
      },
      body: JSON.stringify({
        out: false, // incoming payment
        amount: amount, // in sats
        memo: memo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create invoice: ${error}`);
    }

    const data = await response.json();
    return {
      payment_hash: data.payment_hash,
      payment_request: data.payment_request,
    };
  }

  // Check if an invoice has been paid
  async checkPayment(paymentHash: string): Promise<CheckPaymentResponse> {
    if (!this.endpoint || !this.invoiceKey) {
      throw new Error('LNbits not configured');
    }

    const response = await fetch(`${this.endpoint}/api/v1/payments/${paymentHash}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': this.invoiceKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }

    const data = await response.json();
    return {
      paid: data.paid === true,
    };
  }
}
