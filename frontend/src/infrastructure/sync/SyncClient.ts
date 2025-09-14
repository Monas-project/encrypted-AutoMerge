import { EncryptedDocument } from '../../application/types/Document';

/**
 * Real-time sync client interface
 * Abstracts communication using WebSocket, etc.
 */

export interface SyncClient {
  /**
   * Connect to specified document
   * @param documentId Document ID
   */
  connect(documentId: string): Promise<void>;

  /**
   * Send encrypted data to server
   * @param encryptedDocument Encrypted document data
   */
  sendUpdate(encryptedDocument: EncryptedDocument): Promise<void>;

  /**
   * Get latest document data from server
   * @param documentId Document ID
   * @returns Latest encrypted document data
   */
  getDocument(documentId: string): Promise<EncryptedDocument>;

  /**
   * Receive document updates
   * @param callback Callback to receive update data
   */
  onUpdate(callback: (data: EncryptedDocument) => void): void;
}
