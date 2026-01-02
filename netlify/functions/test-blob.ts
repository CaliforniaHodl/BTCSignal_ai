// Test function to diagnose blob storage issues
import type { Context } from '@netlify/functions';
import { saveToBlob, loadFromBlob } from './lib/shared';

export default async (req: Request, context: Context) => {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // Test 1: Try to load existing blob
  try {
    const existing = await loadFromBlob('market-snapshot');
    results.loadExisting = existing ? 'found data' : 'no data';
  } catch (e: any) {
    results.loadExisting = `error: ${e.message}`;
  }

  // Test 2: Try to save a simple blob
  try {
    const testData = { test: true, time: Date.now() };
    const saved = await saveToBlob('market-snapshot', testData);
    results.saveTest = saved ? 'success' : 'failed';
  } catch (e: any) {
    results.saveTest = `error: ${e.message}`;
  }

  // Test 3: Try to read back what we saved
  try {
    const readBack = await loadFromBlob('market-snapshot');
    results.readBack = readBack;
  } catch (e: any) {
    results.readBack = `error: ${e.message}`;
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
