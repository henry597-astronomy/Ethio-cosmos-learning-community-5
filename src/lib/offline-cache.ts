// Offline cache utility for learning page data using IndexedDB
const DB_NAME = 'EthioCosmosOffline';
const DB_VERSION = 1;
const STORE_NAME = 'learning_data';

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
}

let db: IDBDatabase | null = null;

export async function initOfflineDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export async function cacheOfflineData(key: string, data: any): Promise<void> {
  if (!db) await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      key,
      data,
      timestamp: Date.now(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getOfflineData(key: string): Promise<any | null> {
  if (!db) await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as CachedData | undefined;
      resolve(result ? result.data : null);
    };
  });
}

export async function clearOfflineData(): Promise<void> {
  if (!db) await initOfflineDb();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
