/**
 * Document type definitions for application layer
 */
export interface Document {
  id: string
  text: string
  timestamp: number
}

/**
 * Data to be encrypted (text and timestamp only)
 */
export interface DocumentData {
  text: string
  timestamp: number
}

/**
 * Encrypted data structure for server communication
 */
export interface EncryptedDocument {
  doc_id: string
  ts_cts: string[]  // Encrypted timestamp chunks (16 chunks)
  id_cts: string[]  // Encrypted ID chunks (16 chunks)
  content_id: string  // Content ID (u64 as decimal string)
  content_cts: string[]  // Encrypted content chunks (2*MAX_CONTENT_LEN chunks)
}
