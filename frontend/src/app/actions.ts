import { DocumentService } from '@/application/services/DocumentService'
import { EditorService } from '@/application/services/EditorService'
import { MockDocumentEncryption } from '@/infrastructure/crypto/MockDocumentEncryption'
import { IndexedDBKeyStorage } from '@/infrastructure/storage/IndexedDBKeyStorage'
import { WebSocketSyncClient } from '@/infrastructure/sync/WebSocketSyncClient'
import { Document } from '@/application/types/Document'

// ============================================================================
// Actions - High-level operations that wrap application services
// ============================================================================

// Service instances (singleton pattern)
let documentService: DocumentService | null = null
let editorService: EditorService | null = null

// Helper function to check if services are initialized
const ensureServicesInitialized = (): void => {
  if (!documentService || !editorService) {
    throw new Error('Services not initialized')
  }
}

// ============================================================================
// Service Management
// ============================================================================

export const initializeServices = async (): Promise<void> => {
  if (documentService && editorService) return

  try {
    // Initialize infrastructure services
    const documentEncryption = new MockDocumentEncryption()
    const keyStorage = new IndexedDBKeyStorage()
    const syncClient = new WebSocketSyncClient()

    // Initialize application services
    documentService = new DocumentService(documentEncryption, syncClient, keyStorage)
    editorService = new EditorService()

    console.log('Services initialized successfully')
  } catch (error) {
    console.error('Failed to initialize services:', error)
    throw error
  }
}


// ============================================================================
// Document Actions
// ============================================================================

export const createDocument = async (): Promise<Document> => {
  ensureServicesInitialized()
  return await documentService!.createDocument()
}

export const connectToDocument = async (document: Document): Promise<void> => {
  ensureServicesInitialized()
  
  // TODO: WebSocketエンドポイントが確定したら有効化
  // WebSocket接続を有効化
  // return await documentService!.connectToDocument(document)
  
}

// ============================================================================
// Editor Actions
// ============================================================================

export const updateDocumentText = async (document: Document, newText: string): Promise<void> => {
  ensureServicesInitialized()
  
  try {
    // 実際の暗号化処理を実行（サーバー送信は無効化）
    // TODO: サーバー送信を有効化
    await documentService!.updateDocument(document, newText)
  } catch (error) {
    console.error('Failed to update document:', error)
  }
}

export const emitTextChange = (text: string): void => {
  ensureServicesInitialized()
  editorService!.emitTextChange(text)
}

export const setupEditor = (onTextChange: (text: string) => void): void => {
  ensureServicesInitialized()
  editorService!.onTextChange(onTextChange)
}

export const setupDocumentUpdateListener = (onDocumentUpdate: (document: Document) => void): void => {
  ensureServicesInitialized()
  documentService!.onDocumentUpdate(onDocumentUpdate)
}

export const getCurrentDocument = (): Document | null => {
  ensureServicesInitialized()
  return documentService!.getCurrentDocument()
}