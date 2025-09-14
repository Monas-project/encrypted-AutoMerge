import { SyncClient } from './SyncClient'
import { WsClientUpdate, WsServerSelected } from '../../application/types/fhe'

/**
 * WebSocket sync client implementation
 * Handles real-time synchronization with encrypted documents
 */
export class WebSocketSyncClient implements SyncClient {
  private ws: WebSocket | null = null
  private documentId: string | null = null
  private updateCallbacks: ((data: WsServerSelected) => void)[] = []
  
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000 // 1秒

  constructor() {
  }

  /**
   * Connect to specified document
   * @param documentId Document ID
   */
  async connect(documentId: string): Promise<void> {
    this.documentId = documentId
    
    return new Promise((resolve, reject) => {
      try {
        const wsBaseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:3001'
        const wsEndpoint = process.env.NEXT_PUBLIC_WS_ENDPOINT || '/ws'
        const url = `${wsBaseUrl}${wsEndpoint}?doc_id=${documentId}`
        this.ws = new WebSocket(url)
        
        this.ws.onopen = () => {
          console.log(`Connected to document: ${documentId}`)
          this.reconnectAttempts = 0
          resolve()
        }
        
        this.ws.onmessage = (event) => {
          try {
            const data: WsServerSelected = JSON.parse(event.data)
            this.updateCallbacks.forEach(callback => callback(data))
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          
          // 再接続ロジック
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(async () => {
              this.reconnectAttempts++
              try {
                // 再接続前に最新のドキュメントデータを取得
                const latestDocument = await this.getDocument(documentId)
                
                // 最新データをコールバックに通知
                this.updateCallbacks.forEach(callback => callback(latestDocument))
                
                // WebSocket再接続
                await this.connect(documentId)
              } catch (error) {
                console.error('Reconnection failed:', error)
                // 再接続失敗時は次の試行を継続
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                  setTimeout(() => {
                    this.reconnectAttempts++
                    this.connect(documentId)
                  }, this.reconnectDelay * this.reconnectAttempts)
                }
              }
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
   * Receive document updates
   * @param callback Callback to receive update data
   */
  onUpdate(callback: (data: WsServerSelected) => void): void {
    this.updateCallbacks.push(callback)
  }


  /**
   * Send encrypted data to server
   * @param encryptedDocument Encrypted document data
   */
  async sendUpdate(update: WsClientUpdate): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    
    if (!this.documentId) {
      throw new Error('No document connected')
    }

    try {
      this.ws.send(JSON.stringify(update))
    } catch (error) {
      throw new Error(`Failed to send update: ${error}`)
    }
  }

  /**
   * Get latest document data from server
   * @param documentId Document ID
   * @returns Latest encrypted document data
   */
  async getDocument(documentId: string): Promise<WsServerSelected> {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      const url = `${apiBaseUrl}/ws?doc_id=${documentId}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
      }
      
      const data: WsServerSelected = await response.json()
      return data
    } catch (error) {
      throw new Error(`Failed to get document: ${error}`)
    }
  }
}
