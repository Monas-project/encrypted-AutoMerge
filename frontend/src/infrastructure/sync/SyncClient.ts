/**
 * Real-time sync client interface
 * Abstracts communication using WebSocket, etc.
 */
export interface EncryptedDocument {
  id: string
  content: string
  timestamp: number
  latest: boolean
}

export interface SyncClient {
  /**
   * Connect to specified document
   * @param documentId Document ID
   */
  connect(documentId: string): Promise<void>

  /**
   * Send encrypted data to server
   * @param encryptedData Encrypted data
   * @param timestamp Timestamp
   */
  sendUpdate(encryptedData: string, timestamp: number): Promise<void>

  /**
   * Receive document updates
   * @param callback Callback to receive update data
   */
  onUpdate(callback: (data: EncryptedDocument) => void): void
}
