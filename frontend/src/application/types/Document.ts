/**
 * Document type definitions for application layer
 */
export interface Document {
  id: string
  text: string
  timestamp: number
  cursorLine?: number
}

/**
 * Data to be encrypted (text and timestamp only)
 */
export interface DocumentData {
  // cursorLine may not need to be included??
  text: string
  timestamp: number
}

/**
 * Encrypted data
 * Data to be sent to server
 */
export interface EncryptedDocument {
  id: string
  content: string  // Encrypted DocumentData
  timestamp: number  // Not encrypted (for LWW determination)
  cursorLine?: number  // Not encrypted (for real-time display)
}
