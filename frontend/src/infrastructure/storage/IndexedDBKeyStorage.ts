import { KeyStorage } from './KeyStorage';

/**
 * IndexedDB implementation of key storage
 */
export class IndexedDBKeyStorage implements KeyStorage {
  private readonly dbName = 'EncryptedAutoMerge';
  private readonly storeName = 'keys';
  private readonly version = 2;

  /**
   * Open IndexedDB database
   */
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Recreate store with the expected keyPath 'documentId'
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName);
        }
        db.createObjectStore(this.storeName, { keyPath: 'documentId' });
      };
    });
  }

  /**
   * Save document encryption key
   * @param documentId Document ID
   * @param key Encryption key (string)
   */
  async saveKey(documentId: string, key: string): Promise<void> {
    try {
      // Validate key path value
      if (documentId === undefined || documentId === null) {
        throw new Error('IndexedDB saveKey: documentId is null/undefined');
      }
      const docId = String(documentId);
      if (docId.length === 0) {
        throw new Error('IndexedDB saveKey: documentId is empty');
      }

      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const keyData = {
        documentId: docId,
        key,
        createdAt: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const request = store.put(keyData);
        request.onsuccess = () => resolve();
        request.onerror = async () => {
          const err = request.error;
          // Automatic recovery: if keyPath mis-match or corrupted DB, recreate DB once
          const name = (err && (err as any).name) || '';
          if (name === 'DataError' || name === 'InvalidStateError') {
            try {
              await new Promise<void>((res, rej) => {
                const del = indexedDB.deleteDatabase(this.dbName);
                del.onsuccess = () => res();
                del.onerror = () => rej(del.error);
                del.onblocked = () => res();
              });
              const db2 = await this.openDB();
              const tx2 = db2.transaction([this.storeName], 'readwrite');
              const st2 = tx2.objectStore(this.storeName);
              const req2 = st2.put(keyData);
              req2.onsuccess = () => resolve();
              req2.onerror = () => reject(req2.error);
              return;
            } catch (e) {
              // fallthrough to reject
            }
          }
          reject(err);
        };
      });
    } catch (error) {
      throw new Error(`Failed to save key: ${error}`);
    }
  }

  /**
   * Load document encryption key
   * @param documentId Document ID
   * @returns Encryption key (null if not found)
   */
  async loadKey(documentId: string): Promise<string | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(documentId);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.key : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      throw new Error(`Failed to load key: ${error}`);
    }
  }

  /**
   * Delete specific document encryption key
   * @param documentId Document ID
   */
  async deleteKey(documentId: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.delete(documentId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      throw new Error(`Failed to delete key: ${error}`);
    }
  }
}
