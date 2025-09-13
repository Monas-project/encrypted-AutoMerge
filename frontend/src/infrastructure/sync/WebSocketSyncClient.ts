import { SyncClient, EncryptedDocument } from './SyncClient'

/**
 * WebSocket sync client implementation
 * Handles real-time synchronization with encrypted documents
 */
export class WebSocketSyncClient implements SyncClient {
  private ws: WebSocket | null = null
  private documentId: string | null = null
  private updateCallbacks: ((data: EncryptedDocument) => void)[] = []
  
  // TODO: 設定可能なエンドポイント（環境変数や設定ファイルから取得）
  private readonly wsUrl: string
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000 // 1秒

  constructor(wsUrl: string = 'ws://localhost:8080/ws') {
    this.wsUrl = wsUrl
  }

  /**
   * Connect to specified document
   * @param documentId Document ID
   */
  async connect(documentId: string): Promise<void> {
    this.documentId = documentId
    
    return new Promise((resolve, reject) => {
      try {
        // TODO: 認証トークンが必要な場合の実装
        // const token = this.getAuthToken()
        // const url = `${this.wsUrl}?doc=${documentId}&token=${token}`
        
        const url = `${this.wsUrl}?doc=${documentId}`
        this.ws = new WebSocket(url)
        
        this.ws.onopen = () => {
          console.log(`Connected to document: ${documentId}`)
          this.reconnectAttempts = 0
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          try {
            const data: EncryptedDocument = JSON.parse(event.data)
            this.updateCallbacks.forEach(callback => callback(data))
          } catch (error) {
            console.error('Failed to parse message:', error)
            // エラーは connect() や sendUpdate() の Promise で処理
          }
        }
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          
          // TODO: 再接続ロジック（必要に応じて）
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++
              this.connect(documentId)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }


  /**
   * Send encrypted data to server
   * @param encryptedData Encrypted data
   * @param timestamp Timestamp
   */
  async sendUpdate(encryptedData: string, timestamp: number): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    
    if (!this.documentId) {
      throw new Error('No document connected')
    }

    const message = {
      id: this.documentId,
      content: encryptedData,
      timestamp: timestamp
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      throw new Error(`Failed to send update: ${error}`)
    }
  }

  /**
   * Receive document updates
   * @param callback Callback to receive update data
   */
  onUpdate(callback: (data: EncryptedDocument) => void): void {
    this.updateCallbacks.push(callback)
  }
}
