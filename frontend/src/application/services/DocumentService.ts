import { Document, DocumentData, EncryptedDocument } from '../types/Document'
import { DocumentEncryption } from '../../infrastructure/crypto/DocumentEncryption'
import { SyncClient } from '../../infrastructure/sync/SyncClient'
import { KeyStorage } from '../../infrastructure/storage/KeyStorage'
import { v4 as uuidv4 } from 'uuid'

/**
 * Document service implementation
 * Manages document creation, loading, updating, and sharing
 */
export class DocumentService {
  constructor(
    private documentEncryption: DocumentEncryption,
    private syncClient: SyncClient,
    private keyStorage: KeyStorage
  ) {}

  /**
   * Create new document
   * @returns Created document
   */
  async createDocument(): Promise<Document> {
    // 1. Generate new document ID
    const documentId = uuidv4()
    
    // 2. Generate encryption key
    const key = await this.documentEncryption.generateKey()
    
    // 3. Save key as string
    const keyString = await this.documentEncryption.exportKey(key)
    await this.keyStorage.saveKey(documentId, keyString)
    
    // 4. Create empty document
    const document: Document = {
      id: documentId,
      text: '',
      timestamp: Date.now(),
      cursorLine: 0
    }
    
    return document
  }

  /**
   * Load document from share URL
   * @param shareUrl Share URL
   * @returns Loaded document
   */
  async loadDocument(shareUrl: string): Promise<Document> {
    // 1. Extract documentId and key from URL
    const urlData = this.parseShareUrl(shareUrl)
    if (!urlData) {
      throw new Error('Invalid share URL')
    }
    
    // 2. Import key
    const key = await this.documentEncryption.importKey(urlData.key)
    
    // 3. Get encrypted data from server (temporary implementation)
    // TODO: Need to implement fetching from SyncClient
    const encryptedDocument: EncryptedDocument = {
      id: urlData.documentId,
      content: '', // Temporary value
      timestamp: Date.now(),
      cursorLine: 0
    }
    
    // 4. Decrypt encrypted data
    const documentData: DocumentData = JSON.parse(
      await this.documentEncryption.decrypt(encryptedDocument.content, key)
    )
    
    // 5. Create document object
    const document: Document = {
      id: encryptedDocument.id,
      text: documentData.text,
      timestamp: documentData.timestamp,
      cursorLine: encryptedDocument.cursorLine
    }
    
    return document
  }

  /**
   * Update document
   * @param document Document to update
   * @param newText New text
   * @param cursorLine Cursor position
   */
  async updateDocument(
    document: Document, 
    newText: string, 
    cursorLine?: number
  ): Promise<void> {
    // 1. Update document
    const updatedDocument: Document = {
      ...document,
      text: newText,
      timestamp: Date.now(),
      cursorLine: cursorLine ?? document.cursorLine
    }
    
    // 2. Get key
    const keyString = await this.keyStorage.loadKey(document.id)
    if (!keyString) {
      throw new Error('Key not found')
    }
    const key = await this.documentEncryption.importKey(keyString)
    
    // 3. Create encrypted data
    const documentData: DocumentData = {
      text: newText,
      timestamp: updatedDocument.timestamp
    }
    
    const encryptedContent = await this.documentEncryption.encrypt(
      JSON.stringify(documentData), 
      key
    )
    
    // 4. Send to server
    await this.syncClient.sendUpdate(encryptedContent, updatedDocument.timestamp)
  }

  /**
   * Generate document share URL
   * @param documentId Document ID
   * @returns Share URL
   */
  async shareDocument(documentId: string): Promise<string> {
    // 1. Get key
    const keyString = await this.keyStorage.loadKey(documentId)
    if (!keyString) {
      throw new Error('Key not found')
    }
    
    // 2. Generate share URL
    return this.generateShareUrl(documentId, keyString)
  }

  /**
   * Generate share URL (private function)
   * @param documentId Document ID
   * @param key Encryption key
   * @returns Share URL
   */
  private generateShareUrl(documentId: string, key: string): string {
    // TODO: Implement actual URL generation logic
    const url = new URL('https://example.com/editor')
    url.searchParams.set('doc', documentId)
    url.searchParams.set('key', key)
    return url.toString()
  }

  /**
   * Parse share URL (private function)
   * @param url Share URL
   * @returns Document ID and key (null if parsing fails)
   */
  private parseShareUrl(url: string): { documentId: string; key: string } | null {
    // TODO: Implement actual URL parsing logic
    try {
      const urlObj = new URL(url)
      const docId = urlObj.searchParams.get('doc')
      const key = urlObj.searchParams.get('key')
      
      if (!docId || !key) {
        return null
      }
      
      return { documentId: docId, key: key }
    } catch {
      return null
    }
  }
}
