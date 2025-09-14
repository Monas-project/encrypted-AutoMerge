import { WsClientUpdate, WsServerSelected } from '../../application/types/fhe'

/**
 * Real-time sync client interface
 * Abstracts communication using WebSocket, etc.
 */

export interface SyncClient {
  /**
   * Connect to specified document
   * @param documentId Document ID
   */
  connect(documentId: string): Promise<void>

  /**
   * Send encrypted data to server
   * @param encryptedDocument Encrypted document data
   */
  sendUpdate(update: WsClientUpdate): Promise<void>

  /**
   * Get latest document data from server
   * @param documentId Document ID
   * @returns Latest encrypted document data
   */
  getDocument(documentId: string): Promise<WsServerSelected>

  /**
   * Receive document updates
   * @param callback Callback to receive update data
   */
  onUpdate(callback: (data: WsServerSelected) => void): void
}
