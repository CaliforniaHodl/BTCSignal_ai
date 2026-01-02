// Debug function to test imports
import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  const results: Record<string, string> = {
    timestamp: new Date().toISOString(),
  };

  // Test 1: Import shared module
  try {
    const { saveToBlob, loadFromBlob } = await import('./lib/shared');
    results.sharedImport = 'success';
  } catch (e: any) {
    results.sharedImport = `error: ${e.message}`;
  }

  // Test 2: Import node-data module
  try {
    const { fetchNodeData } = await import('./lib/node-data');
    results.nodeDataImport = 'success';
  } catch (e: any) {
    results.nodeDataImport = `error: ${e.message}`;
  }

  // Test 3: Actually call fetchNodeData
  try {
    const { fetchNodeData } = await import('./lib/node-data');
    const data = await fetchNodeData();
    results.fetchNodeData = data.success ? 'success' : `failed: ${data.error}`;
  } catch (e: any) {
    results.fetchNodeData = `error: ${e.message}`;
  }

  // Test 4: Test a simple fetch
  try {
    const res = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
    if (res.ok) {
      const data = await res.json();
      results.binanceApi = `success: $${parseFloat(data.price).toFixed(0)}`;
    } else {
      results.binanceApi = `http ${res.status}`;
    }
  } catch (e: any) {
    results.binanceApi = `error: ${e.message}`;
  }

  // Test 5: Test blob storage
  try {
    const { saveToBlob, loadFromBlob } = await import('./lib/shared');
    const saved = await saveToBlob('market-snapshot', { test: true, time: Date.now() });
    results.blobSave = saved ? 'success' : 'failed';
  } catch (e: any) {
    results.blobSave = `error: ${e.message}`;
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
