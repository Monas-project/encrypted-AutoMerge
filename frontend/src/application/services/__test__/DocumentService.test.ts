import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentService } from '../DocumentService';
import { DocumentEncryption } from '../../../infrastructure/crypto/DocumentEncryption';
import { SyncClient } from '../../../infrastructure/sync/SyncClient';
import { KeyStorage } from '../../../infrastructure/storage/KeyStorage';
import { Document, DocumentData } from '../../types/Document';

// Create mocks
const mockDocumentEncryption: DocumentEncryption = {
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  generateKey: vi.fn(),
  exportKey: vi.fn(),
  importKey: vi.fn(),
};

const mockSyncClient: SyncClient = {
  connect: vi.fn(),
  sendUpdate: vi.fn(),
  onUpdate: vi.fn(),
};

const mockKeyStorage: KeyStorage = {
  saveKey: vi.fn(),
  loadKey: vi.fn(),
  deleteKey: vi.fn(),
};

describe('DocumentService', () => {
  let documentService: DocumentService;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create DocumentService instance
    documentService = new DocumentService(
      mockDocumentEncryption,
      mockSyncClient,
      mockKeyStorage
    );
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'mock-key-string';

      vi.mocked(mockDocumentEncryption.generateKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.exportKey).mockResolvedValue(
        mockKeyString
      );
      vi.mocked(mockKeyStorage.saveKey).mockResolvedValue();

      const result = await documentService.createDocument();

      expect(result).toMatchObject({
        id: expect.any(String),
        text: '',
        timestamp: expect.any(Number),
        cursorLine: 0,
      });

      expect(mockDocumentEncryption.generateKey).toHaveBeenCalledOnce();
      expect(mockDocumentEncryption.exportKey).toHaveBeenCalledWith(mockKey);
      expect(mockKeyStorage.saveKey).toHaveBeenCalledWith(
        result.id,
        mockKeyString
      );
    });

    it('should throw error when key generation fails', async () => {
      vi.mocked(mockDocumentEncryption.generateKey).mockRejectedValue(
        new Error('Key generation failed')
      );

      await expect(documentService.createDocument()).rejects.toThrow(
        'Key generation failed'
      );
    });

    it('should throw error when key storage fails', async () => {
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'mock-key-string';

      vi.mocked(mockDocumentEncryption.generateKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.exportKey).mockResolvedValue(
        mockKeyString
      );
      vi.mocked(mockKeyStorage.saveKey).mockRejectedValue(
        new Error('Storage failed')
      );

      await expect(documentService.createDocument()).rejects.toThrow(
        'Storage failed'
      );
    });
  });

  describe('loadDocument', () => {
    it('should load document from share URL', async () => {
      const shareUrl = 'https://example.com/editor?doc=doc-123&key=key-456';
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';
      const mockDocumentData: DocumentData = {
        text: 'Hello World',
        timestamp: 1234567890,
      };
      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.decrypt).mockResolvedValue(
        JSON.stringify(mockDocumentData)
      );

      const result = await documentService.loadDocument(shareUrl);

      expect(result).toMatchObject({
        id: 'doc-123',
        text: 'Hello World',
        timestamp: 1234567890,
        cursorLine: 0,
      });

      expect(mockDocumentEncryption.importKey).toHaveBeenCalledWith(
        mockKeyString
      );
      expect(mockDocumentEncryption.decrypt).toHaveBeenCalledWith('', mockKey);
    });

    it('should throw error for invalid share URL', async () => {
      await expect(documentService.loadDocument('invalid-url')).rejects.toThrow(
        'Invalid share URL'
      );
    });

    it('should throw error when key import fails', async () => {
      const shareUrl = 'https://example.com/editor?doc=doc-123&key=key-456';

      vi.mocked(mockDocumentEncryption.importKey).mockRejectedValue(
        new Error('Key import failed')
      );

      await expect(documentService.loadDocument(shareUrl)).rejects.toThrow(
        'Key import failed'
      );
    });

    it('should throw error when decryption fails', async () => {
      const shareUrl = 'https://example.com/editor?doc=doc-123&key=key-456';
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';

      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.decrypt).mockRejectedValue(
        new Error('Decryption failed')
      );

      await expect(documentService.loadDocument(shareUrl)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should throw error for invalid JSON data', async () => {
      const shareUrl = 'https://example.com/editor?doc=doc-123&key=key-456';
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';

      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.decrypt).mockResolvedValue(
        'invalid-json'
      );

      await expect(documentService.loadDocument(shareUrl)).rejects.toThrow();
    });
  });

  describe('updateDocument', () => {
    it('should update document and send to server', async () => {
      const document: Document = {
        id: 'doc-123',
        text: 'Old text',
        timestamp: 1234567890,
        cursorLine: 0,
      };
      const newText = 'New text';
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';
      const mockEncryptedContent = 'encrypted-content';

      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(mockKeyString);
      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.encrypt).mockResolvedValue(
        mockEncryptedContent
      );
      vi.mocked(mockSyncClient.sendUpdate).mockResolvedValue();

      await documentService.updateDocument(document, newText);

      expect(mockKeyStorage.loadKey).toHaveBeenCalledWith('doc-123');
      expect(mockDocumentEncryption.importKey).toHaveBeenCalledWith(
        mockKeyString
      );
      expect(mockDocumentEncryption.encrypt).toHaveBeenCalledWith(
        expect.stringMatching(/^{"text":"New text","timestamp":\d+}$/),
        mockKey
      );
      expect(mockSyncClient.sendUpdate).toHaveBeenCalledWith(
        mockEncryptedContent,
        expect.any(Number)
      );
    });

    it('should throw error when key not found', async () => {
      const document: Document = {
        id: 'doc-123',
        text: 'Old text',
        timestamp: 1234567890,
        cursorLine: 0,
      };
      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(null);

      await expect(
        documentService.updateDocument(document, 'New text')
      ).rejects.toThrow('Key not found');
    });

    it('should throw error when key import fails', async () => {
      const document: Document = {
        id: 'doc-123',
        text: 'Old text',
        timestamp: 1234567890,
        cursorLine: 0,
      };
      const mockKeyString = 'key-456';

      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(mockKeyString);
      vi.mocked(mockDocumentEncryption.importKey).mockRejectedValue(
        new Error('Key import failed')
      );

      await expect(
        documentService.updateDocument(document, 'New text')
      ).rejects.toThrow('Key import failed');
    });

    it('should throw error when encryption fails', async () => {
      const document: Document = {
        id: 'doc-123',
        text: 'Old text',
        timestamp: 1234567890,
        cursorLine: 0,
      };
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';

      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(mockKeyString);
      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.encrypt).mockRejectedValue(
        new Error('Encryption failed')
      );

      await expect(
        documentService.updateDocument(document, 'New text')
      ).rejects.toThrow('Encryption failed');
    });

    it('should throw error when server sync fails', async () => {
      const document: Document = {
        id: 'doc-123',
        text: 'Old text',
        timestamp: 1234567890,
        cursorLine: 0,
      };
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';
      const mockEncryptedContent = 'encrypted-content';

      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(mockKeyString);
      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.encrypt).mockResolvedValue(
        mockEncryptedContent
      );
      vi.mocked(mockSyncClient.sendUpdate).mockRejectedValue(
        new Error('Sync failed')
      );

      await expect(
        documentService.updateDocument(document, 'New text')
      ).rejects.toThrow('Sync failed');
    });

    it('should update document with cursor position', async () => {
      const document: Document = {
        id: 'doc-123',
        text: 'Old text',
        timestamp: 1234567890,
        cursorLine: 0,
      };
      const newText = 'New text';
      const cursorLine = 5;
      const mockKey = {} as CryptoKey;
      const mockKeyString = 'key-456';
      const mockEncryptedContent = 'encrypted-content';

      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(mockKeyString);
      vi.mocked(mockDocumentEncryption.importKey).mockResolvedValue(mockKey);
      vi.mocked(mockDocumentEncryption.encrypt).mockResolvedValue(
        mockEncryptedContent
      );
      vi.mocked(mockSyncClient.sendUpdate).mockResolvedValue();

      await documentService.updateDocument(document, newText, cursorLine);

      expect(mockDocumentEncryption.encrypt).toHaveBeenCalledWith(
        expect.stringMatching(/^{"text":"New text","timestamp":\d+}$/),
        mockKey
      );
      expect(mockSyncClient.sendUpdate).toHaveBeenCalledWith(
        mockEncryptedContent,
        expect.any(Number)
      );
    });
  });

  describe('shareDocument', () => {
    it('should generate share URL for document', async () => {
      const documentId = 'doc-123';
      const mockKeyString = 'key-456';
      const mockShareUrl = 'https://example.com/editor?doc=doc-123&key=key-456';
      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(mockKeyString);

      const result = await documentService.shareDocument(documentId);

      expect(result).toBe(mockShareUrl);
      expect(mockKeyStorage.loadKey).toHaveBeenCalledWith(documentId);
    });

    it('should throw error when key not found', async () => {
      vi.mocked(mockKeyStorage.loadKey).mockResolvedValue(null);

      await expect(documentService.shareDocument('doc-123')).rejects.toThrow(
        'Key not found'
      );
    });

    it('should throw error when key loading fails', async () => {
      vi.mocked(mockKeyStorage.loadKey).mockRejectedValue(
        new Error('Storage read failed')
      );

      await expect(documentService.shareDocument('doc-123')).rejects.toThrow(
        'Storage read failed'
      );
    });
  });
});
