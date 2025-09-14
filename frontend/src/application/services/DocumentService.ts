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
  private currentDocument: Document | null = null
  private isConnected = false

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
      timestamp: Date.now()
    }
    
    // 5. Store as current document
    this.currentDocument = document
    
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
    
    // 3. Get encrypted data from server
    const encryptedDocument = await this.syncClient.getDocument(urlData.documentId)
    
    // 4. Decrypt encrypted data (temporary implementation)
    const contentData = encryptedDocument.content_cts[0] // 配列の最初の要素を使用
    const documentData: DocumentData = JSON.parse(
      await this.documentEncryption.decrypt(contentData, key)
    )
    
    // 5. Create document object
    const document: Document = {
      id: encryptedDocument.doc_id,
      text: documentData.text,
      timestamp: documentData.timestamp
    }
    
    // 6. Store as current document
    this.currentDocument = document
    
    return document
  }

  /**
   * Connect to document for real-time sync
   * @param document Document to connect to
   */
  async connectToDocument(document: Document): Promise<void> {
    if (!this.currentDocument || this.currentDocument.id !== document.id) {
      this.currentDocument = document
    }

    try {
      // Connect to WebSocket
      await this.syncClient.connect(document.id)
      this.isConnected = true

      // Set up remote update listener
      this.syncClient.onUpdate(async (encryptedDocument) => {
        await this.handleRemoteUpdate(encryptedDocument)
      })

      console.log(`Connected to document: ${document.id}`)
    } catch (error) {
      console.error('Failed to connect to document:', error)
      throw error
    }
  }

  /**
   * Handle remote document updates
   * @param encryptedDocument Encrypted document from server
   */
  private async handleRemoteUpdate(encryptedDocument: EncryptedDocument): Promise<void> {
    if (!this.currentDocument) {
      console.warn('Received remote update but no current document')
      return
    }

    try {
      // Get encryption key
      const keyString = await this.keyStorage.loadKey(encryptedDocument.doc_id)
      if (!keyString) {
        console.error('Key not found for remote update')
        return
      }
      const key = await this.documentEncryption.importKey(keyString)

      // TODO: WASM暗号化サービスで新しい構造から復号化
      // 現在は一時的にレガシー構造として処理
      
      // 新しい構造からコンテンツを復号化（WASMサービス実装後に置き換え）
      const contentData = encryptedDocument.content_cts[0] // 配列の最初の要素を使用
      const documentData: DocumentData = JSON.parse(
        await this.documentEncryption.decrypt(contentData, key)
      )

      // Update current document
      this.currentDocument = {
        ...this.currentDocument,
        text: documentData.text,
        timestamp: documentData.timestamp
      }

      console.log('Document updated from remote:', this.currentDocument.id)
    } catch (error) {
      console.error('Failed to handle remote update:', error)
    }
  }

  /**
   * Disconnect from current document
   */
  disconnectFromDocument(): void {
    this.isConnected = false
    this.currentDocument = null
    console.log('Disconnected from document')
  }

  /**
   * Get current document
   */
  getCurrentDocument(): Document | null {
    return this.currentDocument
  }

  /**
   * Check if connected to a document
   */
  isConnectedToDocument(): boolean {
    return this.isConnected && this.currentDocument !== null
  }

  /**
   * Update document
   * @param document Document to update
   * @param newText New text
   */
  async updateDocument(
    document: Document, 
    newText: string
  ): Promise<void> {
    // 1. Update document
    const updatedDocument: Document = {
      ...document,
      text: newText,
      timestamp: Date.now()
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
    
    // 4. Update current document
    this.currentDocument = updatedDocument
    
    // 5. Send to server (if connected)
    if (this.isConnected) {
      // TODO: WASM暗号化サービスで新しい構造に変換
      // 現在は一時的にレガシー構造を使用
      
      // 新しい構造に変換（WASMサービス実装後に置き換え）
      const encryptedDocument: EncryptedDocument = {
        doc_id: document.id,
        ts_cts: [], // WASMで生成
        id_cts: [], // WASMで生成
        content_id: updatedDocument.timestamp.toString(),
        content_cts: [encryptedContent] // 暗号化済みデータを配列として送信
      }
      
      await this.syncClient.sendUpdate(encryptedDocument)
    }
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
