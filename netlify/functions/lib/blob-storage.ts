// Netlify Blob Storage Utility
// Replaces GitHub commits with Blob storage to eliminate build triggers
import { getStore } from '@netlify/blobs';

export type BlobKey =
  | 'exchange-flows'
  | 'cohort-metrics'
  | 'profitability-metrics'
  | 'onchain-metrics'
  | 'onchain-data'
  | 'market-snapshot'
  | 'derivatives-advanced'
  | 'price-models'
  | 'signal-history'
  | 'historical-calls'
  | 'whale-alerts';

const STORE_NAME = 'btc-signal-data';

/**
 * Save data to Netlify Blob storage
 * @param key - The blob key/name
 * @param data - JSON-serializable data to store
 * @returns true if saved successfully
 */
export async function saveToBlob<T>(key: BlobKey, data: T): Promise<boolean> {
  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(key, data);
    console.log(`[Blob] Saved ${key} successfully`);
    return true;
  } catch (error: any) {
    console.error(`[Blob] Failed to save ${key}:`, error.message);
    return false;
  }
}

/**
 * Load data from Netlify Blob storage
 * @param key - The blob key/name
 * @returns The stored data or null if not found
 */
export async function loadFromBlob<T>(key: BlobKey): Promise<T | null> {
  try {
    const store = getStore(STORE_NAME);
    const data = await store.get(key, { type: 'json' });
    if (data) {
      console.log(`[Blob] Loaded ${key} successfully`);
      return data as T;
    }
    console.log(`[Blob] No data found for ${key}`);
    return null;
  } catch (error: any) {
    console.error(`[Blob] Failed to load ${key}:`, error.message);
    return null;
  }
}

/**
 * Check if a blob exists
 * @param key - The blob key/name
 * @returns true if the blob exists
 */
export async function blobExists(key: BlobKey): Promise<boolean> {
  try {
    const store = getStore(STORE_NAME);
    const metadata = await store.getMetadata(key);
    return metadata !== null;
  } catch {
    return false;
  }
}

/**
 * Delete a blob
 * @param key - The blob key/name
 * @returns true if deleted successfully
 */
export async function deleteBlob(key: BlobKey): Promise<boolean> {
  try {
    const store = getStore(STORE_NAME);
    await store.delete(key);
    console.log(`[Blob] Deleted ${key} successfully`);
    return true;
  } catch (error: any) {
    console.error(`[Blob] Failed to delete ${key}:`, error.message);
    return false;
  }
}

/**
 * List all blobs in the store
 * @returns Array of blob keys
 */
export async function listBlobs(): Promise<string[]> {
  try {
    const store = getStore(STORE_NAME);
    const result = await store.list();
    return result.blobs.map(blob => blob.key);
  } catch (error: any) {
    console.error('[Blob] Failed to list blobs:', error.message);
    return [];
  }
}

/**
 * Get blob metadata (size, etag, etc.)
 * @param key - The blob key/name
 */
export async function getBlobMetadata(key: BlobKey) {
  try {
    const store = getStore(STORE_NAME);
    return await store.getMetadata(key);
  } catch {
    return null;
  }
}
