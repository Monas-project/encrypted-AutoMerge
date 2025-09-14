/**
 * Document encryption interface
 * Implementation will be done with selected encryption library later
 */
export interface DocumentEncryption {
  /**
   * Encrypt data
   * @param data Data to encrypt
   * @param key Encryption key
   * @returns Encrypted data (Base64 string)
   */
  encrypt(data: string, key: CryptoKey): Promise<string>;

  /**
   * Decrypt data
   * @param encryptedData Encrypted data (Base64 string)
   * @param key Decryption key
   * @returns Decrypted data
   */
  decrypt(encryptedData: string, key: CryptoKey): Promise<string>;

  /**
   * Generate new encryption key
   * @returns Generated CryptoKey
   */
  generateKey(): Promise<CryptoKey>;

  /**
   * Export key as string
   * @param key Key to export
   * @returns String representation of key (Base64)
   */
  exportKey(key: CryptoKey): Promise<string>;

  /**
   * Import key from string
   * @param keyString String representation of key (Base64)
   * @returns Imported CryptoKey
   */
  importKey(keyString: string): Promise<CryptoKey>;
}
