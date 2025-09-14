/**
 * Server key storage using IndexedDB
 * Stores compressed shortint server key as Base64 string
 */
export class ServerKeyStorage {
  private readonly dbName = 'EncryptedAutoMerge'
  private readonly storeName = 'server_keys'
  private readonly version = 1

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }
    })
  }

  async saveCompressedServerKey(paramKey: string, keyB64: string): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction([this.storeName], 'readwrite')
    const store = tx.objectStore(this.storeName)
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key: paramKey, value: keyB64, updatedAt: Date.now() })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async loadCompressedServerKey(paramKey: string): Promise<string | null> {
    const db = await this.openDB()
    const tx = db.transaction([this.storeName], 'readonly')
    const store = tx.objectStore(this.storeName)
    return new Promise((resolve, reject) => {
      const req = store.get(paramKey)
      req.onsuccess = () => resolve(req.result ? (req.result as any).value as string : null)
      req.onerror = () => reject(req.error)
    })
  }
}


