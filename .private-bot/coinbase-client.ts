import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';

export interface AccountBalance {
  currency: string;
  available: string;
  hold: string;
}

export interface Order {
  orderId: string;
  productId: string;
  side: 'BUY' | 'SELL';
  status: string;
  filledSize: string;
  filledValue: string;
  averageFilledPrice: string;
  createdTime: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  order?: Order;
}

export class CoinbaseClient {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = config.coinbase.apiKey;
    this.apiSecret = config.coinbase.apiSecret;

    this.client = axios.create({
      baseURL: config.coinbase.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Generate signature for Coinbase Advanced Trade API
   */
  private generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): string {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', this.apiSecret);
    hmac.update(message);
    return hmac.digest('hex');
  }

  /**
   * Make authenticated request to Coinbase
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: object
  ): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? JSON.stringify(body) : '';
    const signature = this.generateSignature(timestamp, method, path, bodyStr);

    const headers = {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
    };

    const response = await this.client.request({
      method,
      url: path,
      data: body,
      headers,
    });

    return response.data;
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<AccountBalance[]> {
    const response = await this.request<{ accounts: any[] }>('GET', '/api/v3/brokerage/accounts');

    return response.accounts.map(acc => ({
      currency: acc.currency,
      available: acc.available_balance.value,
      hold: acc.hold.value,
    }));
  }

  /**
   * Get USD balance
   */
  async getUsdBalance(): Promise<number> {
    const balances = await this.getBalances();
    const usd = balances.find(b => b.currency === 'USD');
    return usd ? parseFloat(usd.available) : 0;
  }

  /**
   * Get BTC balance
   */
  async getBtcBalance(): Promise<number> {
    const balances = await this.getBalances();
    const btc = balances.find(b => b.currency === 'BTC');
    return btc ? parseFloat(btc.available) : 0;
  }

  /**
   * Get current BTC price
   */
  async getCurrentPrice(): Promise<number> {
    const response = await axios.get(
      'https://api.exchange.coinbase.com/products/BTC-USD/ticker'
    );
    return parseFloat(response.data.price);
  }

  /**
   * Place a market buy order
   */
  async marketBuy(usdAmount: number): Promise<OrderResult> {
    try {
      const clientOrderId = `bot-buy-${Date.now()}`;

      const response = await this.request<{ success: boolean; order_id: string; error_response?: any }>(
        'POST',
        '/api/v3/brokerage/orders',
        {
          client_order_id: clientOrderId,
          product_id: config.trading.productId,
          side: 'BUY',
          order_configuration: {
            market_market_ioc: {
              quote_size: usdAmount.toFixed(2),
            },
          },
        }
      );

      if (response.success) {
        return {
          success: true,
          orderId: response.order_id,
        };
      } else {
        return {
          success: false,
          error: response.error_response?.message || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Place a market sell order
   */
  async marketSell(btcAmount: number): Promise<OrderResult> {
    try {
      const clientOrderId = `bot-sell-${Date.now()}`;

      const response = await this.request<{ success: boolean; order_id: string; error_response?: any }>(
        'POST',
        '/api/v3/brokerage/orders',
        {
          client_order_id: clientOrderId,
          product_id: config.trading.productId,
          side: 'SELL',
          order_configuration: {
            market_market_ioc: {
              base_size: btcAmount.toFixed(8),
            },
          },
        }
      );

      if (response.success) {
        return {
          success: true,
          orderId: response.order_id,
        };
      } else {
        return {
          success: false,
          error: response.error_response?.message || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Place a limit sell order (for take profit)
   */
  async limitSell(btcAmount: number, price: number): Promise<OrderResult> {
    try {
      const clientOrderId = `bot-tp-${Date.now()}`;

      const response = await this.request<{ success: boolean; order_id: string; error_response?: any }>(
        'POST',
        '/api/v3/brokerage/orders',
        {
          client_order_id: clientOrderId,
          product_id: config.trading.productId,
          side: 'SELL',
          order_configuration: {
            limit_limit_gtc: {
              base_size: btcAmount.toFixed(8),
              limit_price: price.toFixed(2),
              post_only: false,
            },
          },
        }
      );

      if (response.success) {
        return {
          success: true,
          orderId: response.order_id,
        };
      } else {
        return {
          success: false,
          error: response.error_response?.message || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Place a stop loss order
   */
  async stopLoss(btcAmount: number, stopPrice: number): Promise<OrderResult> {
    try {
      const clientOrderId = `bot-sl-${Date.now()}`;

      const response = await this.request<{ success: boolean; order_id: string; error_response?: any }>(
        'POST',
        '/api/v3/brokerage/orders',
        {
          client_order_id: clientOrderId,
          product_id: config.trading.productId,
          side: 'SELL',
          order_configuration: {
            stop_limit_stop_limit_gtc: {
              base_size: btcAmount.toFixed(8),
              limit_price: (stopPrice * 0.99).toFixed(2), // Slightly below stop to ensure fill
              stop_price: stopPrice.toFixed(2),
            },
          },
        }
      );

      if (response.success) {
        return {
          success: true,
          orderId: response.order_id,
        };
      } else {
        return {
          success: false,
          error: response.error_response?.message || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.request('POST', '/api/v3/brokerage/orders/batch_cancel', {
        order_ids: [orderId],
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get order status
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const response = await this.request<{ order: any }>('GET', `/api/v3/brokerage/orders/historical/${orderId}`);
      const o = response.order;

      return {
        orderId: o.order_id,
        productId: o.product_id,
        side: o.side,
        status: o.status,
        filledSize: o.filled_size || '0',
        filledValue: o.filled_value || '0',
        averageFilledPrice: o.average_filled_price || '0',
        createdTime: o.created_time,
      };
    } catch (error) {
      return null;
    }
  }
}
