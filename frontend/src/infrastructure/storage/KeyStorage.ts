/**
 * Key storage interface
 * Abstracts key persistence using IndexedDB, etc.
 */
export interface KeyStorage {
  /**
   * Save document encryption key
   * @param documentId Document ID
   * @param key Encryption key (string)
   */
  saveKey(documentId: string, key: string): Promise<void>;

  /**
   * Load document encryption key
   * @param documentId Document ID
   * @returns Encryption key (null if not found)
   */
  loadKey(documentId: string): Promise<string | null>;

  /**
   * Delete specific document encryption key
   * @param documentId Document ID
   */
  deleteKey(documentId: string): Promise<void>;
}
