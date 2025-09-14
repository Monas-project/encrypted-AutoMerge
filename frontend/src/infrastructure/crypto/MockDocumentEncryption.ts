import { DocumentEncryption } from './DocumentEncryption'

// 削除予定

/**
 * Mock implementation of document encryption
 * Used until WASM implementation is ready
 * Stores data as plain text for development purposes
 */
export class MockDocumentEncryption implements DocumentEncryption {
  /**
   * Mock encrypt - just returns base64 encoded data
   * @param data Data to encrypt
   * @param key Encryption key (ignored in mock)
   * @returns Mock encrypted data (Base64 string)
   */
  async encrypt(data: string, key: CryptoKey): Promise<string> {
    // In mock implementation, just base64 encode the data
    return btoa(unescape(encodeURIComponent(data)))
  }

  /**
   * Mock decrypt - just decodes base64 data
   * @param encryptedData Encrypted data (Base64 string)
   * @param key Decryption key (ignored in mock)
   * @returns Decrypted data
   */
  async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    // In mock implementation, just base64 decode the data
    return decodeURIComponent(escape(atob(encryptedData)))
  }

  /**
   * Mock generate key - returns a mock CryptoKey
   * @returns Mock CryptoKey
   */
  async generateKey(): Promise<CryptoKey> {
    // Create a mock CryptoKey object
    const mockKey = {
      type: 'secret' as KeyType,
      extractable: true,
      algorithm: { name: 'AES-GCM' },
      usages: ['encrypt', 'decrypt'] as KeyUsage[]
    } as CryptoKey
    
    return mockKey
  }

  /**
   * Mock export key - returns a mock key string
   * @param key Key to export
   * @returns Mock key string
   */
  async exportKey(key: CryptoKey): Promise<string> {
    // Return a mock key string
    return 'mock-key-' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Mock import key - returns a mock CryptoKey
   * @param keyString String representation of key
   * @returns Mock CryptoKey
   */
  async importKey(keyString: string): Promise<CryptoKey> {
    // Return the same mock key structure
    return this.generateKey()
  }
}
