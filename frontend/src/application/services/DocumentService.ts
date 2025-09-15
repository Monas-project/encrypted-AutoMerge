import { Document } from '../types/Document'
import { SyncClient } from '../../infrastructure/sync/SyncClient'
import { KeyStorage } from '../../infrastructure/storage/KeyStorage'
import { GetContentResponse, WsClientUpdate, WsServerSelected } from '../types/fhe'
import { loadTfhe, nextMonotonicTs, encryptU64ToDigitsB64Array, encryptContentToNibbleArrayB64, restoreClientKey, decryptDigitsB64ArrayToU64, decryptContentFromNibbleArrayB64 } from '../../infrastructure/crypto/TfheShortint'
import { v4 as uuidv4 } from 'uuid'
import { ServerKeyStorage } from '../../infrastructure/storage/ServerKeyStorage'

/**
 * Document service implementation
 * Manages document creation, loading, updating, and sharing
 */
export class DocumentService {
  private currentDocument: Document | null = null;
  private isConnected = false;
  private documentUpdateCallbacks: ((document: Document) => void)[] = [];

  constructor(
    private syncClient: SyncClient,
    private keyStorage: KeyStorage
  ) {}

  private async ensureServerKeyPosted(): Promise<void> {
    try {
      const paramKey = 'V0_11_PARAM_MESSAGE_4_CARRY_2_KS_PBS_GAUSSIAN_2M64'
      const skStore = new ServerKeyStorage()
      const csk_b64 = await skStore.loadCompressedServerKey(paramKey)
      if (csk_b64) {
        const api = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
        console.log('[doc] post server key if needed')
        await fetch(`${api}/keys/set_server_key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ server_key_b64: csk_b64 }),
        }).catch(() => {})
      }
    } catch (e) {
      console.warn('[doc] ensureServerKeyPosted failed', e)
    }
  }

  /**
   * Register callback for document updates
   * @param callback Callback function to receive document updates
   */
  onDocumentUpdate(callback: (document: Document) => void): void {
    this.documentUpdateCallbacks.push(callback);
  }

  /**
   * Save provided client key for a specific document
   */
  async setKeyForDocument(documentId: string, keyString: string): Promise<void> {
    await this.keyStorage.saveKey(documentId, keyString)
  }

  /**
   * Get current document
   * @returns Current document or null
   */
  getCurrentDocument(): Document | null {
    return this.currentDocument;
  }

  /**
   * Create new document
   * @returns Created document
   */
  async createDocument(): Promise<Document> {
    // 1. Generate new document ID
    const documentId = uuidv4()
    
    // 2. Generate shortint keys via worker path (or later from worker cache)
    // ここでは簡易化: 既存保存が無ければ worker で生成した client_key をBase64で保存する設計とする
    const keyString = await this.ensureClientKey(documentId)
    await this.keyStorage.saveKey(documentId, keyString)
    
    // 4. Create empty document
    const document: Document = {
      id: documentId,
      text: '',
      timestamp: Date.now(),
    };

    // 5. Store as current document
    this.currentDocument = document;

    return document;
  }

  /**
   * Create document object with provided id (for shared URLs)
   */
  async createDocumentWithId(documentId: string): Promise<Document> {
    // 既にキーが保存されている前提（URLフラグメント等で投入）
    const document: Document = { id: documentId, text: '', timestamp: Date.now() }
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
    const urlData = this.parseShareUrl(shareUrl);
    if (!urlData) {
      throw new Error('Invalid share URL');
    }
    
    const _keyString = urlData.key // 互換用: 既存URLに載っている場合
    
    // 3. Get encrypted data from server
    const _selected = await this.syncClient.getDocument(urlData.documentId)
    
    // 表示データはWSから選択ID受領 → HTTPフェッチ → 復号の流れで更新されるため、ここでは空
    
    // 5. Create document object
    const document: Document = { id: urlData.documentId, text: '', timestamp: Date.now() }
    
    // 6. Store as current document
    this.currentDocument = document;

    return document;
  }

  /**
   * Connect to document for real-time sync
   * @param document Document to connect to
   */
  async connectToDocument(document: Document): Promise<void> {
    if (!this.currentDocument || this.currentDocument.id !== document.id) {
      this.currentDocument = document;
    }

    try {
      // make sure server has a key even after restart
      await this.ensureServerKeyPosted()
      // Connect to WebSocket
      console.log('[doc] connect start', { docId: document.id })
      await this.syncClient.connect(document.id);
      this.isConnected = true;
      console.log('[doc] connect ok', { docId: document.id })

      // Set up remote update listener
      this.syncClient.onUpdate(async (selected: WsServerSelected) => {
        console.log('[doc] onUpdate selected_id_cts', { len: selected.selected_id_cts?.length })
        await this.handleRemoteUpdate(selected)
      })

      console.log(`Connected to document: ${document.id}`);
    } catch (error) {
      console.error('Failed to connect to document:', error);
      throw error;
    }
  }

  /**
   * Handle remote document updates
   * @param encryptedDocument Encrypted document from server
   */
  private async handleRemoteUpdate(selected: WsServerSelected): Promise<void> {
    if (!this.currentDocument) {
      console.warn('Received remote update but no current document');
      return;
    }

    try {
      // Get encryption key
      const keyString = await this.keyStorage.loadKey(selected.doc_id)
      if (!keyString) {
        console.error('Key not found for remote update');
        return;
      }
      const tfhe = await loadTfhe()
      const cks = await restoreClientKey(tfhe, keyString)
      // decrypt selected id -> u64
      const id = decryptDigitsB64ArrayToU64(tfhe, cks, selected.selected_id_cts)
      const contentId = id.toString(10)
      // fetch content via HTTP (no-store)
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      const res = await fetch(`${apiBaseUrl}/content/${contentId}`, { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as GetContentResponse
      const text = decryptContentFromNibbleArrayB64(tfhe, cks, json.content_cts)

      // Update current document
      this.currentDocument = {
        ...this.currentDocument,
        text,
        timestamp: Date.now()
      }

      // Notify UI layer about the update
      this.documentUpdateCallbacks.forEach(callback => {
        callback(this.currentDocument!);
      });

      console.log('Document updated from remote:', this.currentDocument.id);
    } catch (error) {
      console.error('Failed to handle remote update:', error);
    }
  }

  /**
   * Update document
   * @param document Document to update
   * @param newText New text
   */
  async updateDocument(document: Document, newText: string): Promise<void> {
    // 1. Update document
    const updatedDocument: Document = {
      ...document,
      text: newText,
      timestamp: Date.now(),
    };

    // 2. Get key
    const keyString = await this.keyStorage.loadKey(document.id);
    if (!keyString) {
      throw new Error('Key not found');
    }
    const tfhe = await loadTfhe()
    const cks = await restoreClientKey(tfhe, keyString)
    
    // 3. Create encrypted data
    const ts = nextMonotonicTs()
    const ts_cts = encryptU64ToDigitsB64Array(tfhe, cks, ts)
    // random content_id (u64)
    const randId = (BigInt.asUintN(64, BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))) << 1n) | 1n
    const id_cts = encryptU64ToDigitsB64Array(tfhe, cks, randId)
    const content_cts = encryptContentToNibbleArrayB64(tfhe, cks, newText)
    
    // 4. Update current document
    this.currentDocument = updatedDocument;

    // 5. Send to server (if connected)
    if (this.isConnected) {
      const outbound: WsClientUpdate = {
        doc_id: document.id,
        ts_cts: ts_cts as unknown as string[],
        id_cts: id_cts as unknown as string[],
        content_id: randId.toString(10) as any,
        content_cts: content_cts as unknown as string[],
      }
      console.log('[doc] sendUpdate', { docId: document.id, ts_len: outbound.ts_cts.length, id_len: outbound.id_cts.length, content_len: outbound.content_cts.length })
      await this.syncClient.sendUpdate(outbound)
    }
  }

  /**
   * Generate document share URL
   * @param documentId Document ID
   * @returns Share URL
   */
  async shareDocument(documentId: string): Promise<string> {
    // 1. Get key
    const keyString = await this.keyStorage.loadKey(documentId);
    if (!keyString) {
      throw new Error('Key not found');
    }

    // 2. Generate share URL
    return this.generateShareUrl(documentId, keyString);
  }

  /**
   * Generate share URL (private function)
   * @param documentId Document ID
   * @param key Encryption key
   * @returns Share URL
   */
  private generateShareUrl(documentId: string, key: string): string {
    // フラグメントに鍵を載せる: /doc?doc_id={id}#k={base64}
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const base = origin || ''
    return `${base}/doc?doc_id=${encodeURIComponent(documentId)}#k=${encodeURIComponent(key)}`
  }

  /**
   * Parse share URL (private function)
   * @param url Share URL
   * @returns Document ID and key (null if parsing fails)
   */
  private parseShareUrl(
    url: string
  ): { documentId: string; key: string } | null {
    // TODO: Implement actual URL parsing logic
    try {
      const urlObj = new URL(url);
      const docId = urlObj.searchParams.get('doc');
      const key = urlObj.searchParams.get('key');

      if (!docId || !key) {
        return null;
      }

      return { documentId: docId, key: key };
    } catch {
      return null;
    }
  }

  private async ensureClientKey(documentId: string): Promise<string> {
    const existing = await this.keyStorage.loadKey(documentId)
    if (existing) return existing
    // generate via worker
    // Pre-post cached compressed server key if available
    try {
      const paramKey = 'V0_11_PARAM_MESSAGE_4_CARRY_2_KS_PBS_GAUSSIAN_2M64'
      const skStore = new ServerKeyStorage()
      const csk_b64_cached = await skStore.loadCompressedServerKey(paramKey)
      if (csk_b64_cached) {
        fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001') + '/keys/set_server_key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ server_key_b64: csk_b64_cached }),
        }).catch(() => {})
      }
    } catch {}

    const workerUrl = new URL('../../worker/ckgen-worker.js', import.meta.url)
    const w = new Worker(workerUrl, { type: 'module' })
    const tfheModuleUrl = process.env.NEXT_PUBLIC_TFHE_JS_URL || '/tfhe/tfhe.js'
    const b64 = await new Promise<string>((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        const d = ev.data || {}
        if (d.t === 'keys') {
          const cksBytes = new Uint8Array(d.client_key_bytes)
          // encode base64 w/o Buffer for browser
          let binary = ''
          for (let i = 0; i < cksBytes.length; i++) binary += String.fromCharCode(cksBytes[i])
          const b64 = btoa(binary)

          // try reuse compressed server key
          ;(async () => {
            try {
              const paramKey = 'V0_11_PARAM_MESSAGE_4_CARRY_2_KS_PBS_GAUSSIAN_2M64'
              const skStore = new ServerKeyStorage()
              let csk_b64 = await skStore.loadCompressedServerKey(paramKey)
              if (!csk_b64 && d.c_sks_bytes) {
                const c_sks_bytes = new Uint8Array(d.c_sks_bytes)
                let bin2 = ''
                for (let i = 0; i < c_sks_bytes.length; i++) bin2 += String.fromCharCode(c_sks_bytes[i])
                csk_b64 = btoa(bin2)
                await skStore.saveCompressedServerKey(paramKey, csk_b64)
              }
              if (csk_b64) {
                await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001') + '/keys/set_server_key', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ server_key_b64: csk_b64 }),
                })
              }
            } catch {}
          })()

          w.removeEventListener('message', onMsg as any)
          resolve(b64)
        } else if (d.t === 'progress') {
          // surface progress for debugging
          console.log('[ckgen-worker]', d)
        } else if (d.t === 'err') {
          reject(new Error(d.msg))
        }
      }
      w.addEventListener('message', onMsg as any)
      w.postMessage({ t: 'gen', tfheModuleUrl })
    })
    await this.keyStorage.saveKey(documentId, b64)
    return b64
  }
}
