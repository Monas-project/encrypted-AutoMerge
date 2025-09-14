'use client'
import { useState, useLayoutEffect } from 'react';
import TopBar from '@/components/TopBar';
import Toolbar from '@/components/Toolbar';
import Ruler from '@/components/Ruler';
import EditorPage from '@/components/EditorPage';
import { Document } from '@/application/types/Document';
import { 
  initializeServices, 
  createDocument, 
  connectToDocument, 
  updateDocumentText, 
  emitTextChange,
  setupEditor,
  setupDocumentUpdateListener,
  getCurrentDocument,
} from './actions';

// Constants
const DEFAULT_TITLE = '無題のドキュメント';
const DEFAULT_ZOOM = 1;
const DEFAULT_PAGE_MARGIN = { left: 96, right: 96 };
const DEFAULT_FONT_FAMILY = 'sans' as const;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_ALIGN = 'left' as const;

export default function Page() {
  // UI state
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pageMargin, setPageMargin] = useState(DEFAULT_PAGE_MARGIN);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>(DEFAULT_FONT_FAMILY);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>(DEFAULT_ALIGN);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);

  // Document state
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize services and document
  useLayoutEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize services
        await initializeServices();

        // Create new document
        const newDocument = await createDocument();
        setCurrentDocument(newDocument);
        setTitle(DEFAULT_TITLE);

        // Connect to document for real-time sync
        await connectToDocument(newDocument);
        setIsConnected(true);

        // Set up editor text change handler
        setupEditor(async (newText: string) => {
          try {
            await updateDocumentText(newDocument, newText);
            setCurrentDocument(prev => prev ? { ...prev, text: newText } : null);
          } catch (error) {
            console.error('ドキュメントの更新に失敗しました:', error);
          }
        });

        // Set up document update listener for remote changes
        setupDocumentUpdateListener((updatedDocument: Document) => {
          console.log('Received remote document update:', updatedDocument);
          setCurrentDocument(updatedDocument);
          
          // デバッグ用：リモート更新の通知
          console.log('🔄 Remote update applied:', {
            id: updatedDocument.id,
            textLength: updatedDocument.text.length,
            timestamp: new Date(updatedDocument.timestamp).toLocaleTimeString()
          });
        });

        console.log('App initialized successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'アプリケーションの初期化に失敗しました';
        setError(errorMessage);
        console.error('Failed to initialize app:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle text changes from editor
  const onTextChange = (text: string) => {
    emitTextChange(text);
  };

  // Show loading state while services are initializing
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">サービスを初期化中...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-2">初期化に失敗しました</p>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800">
      <div className='flex-shrink-0'>
        <TopBar
          title={title}
          onTitleChange={setTitle}
          zoom={zoom}
          onZoomChange={setZoom}
        />
        <Toolbar
            zoom={zoom}
            setZoom={setZoom}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            fontSize={fontSize}
            setFontSize={setFontSize}
            bold={bold}
            setBold={setBold}
            italic={italic}
            setItalic={setItalic}
            underline={underline}
            setUnderline={setUnderline}
            align={align}
            setAlign={setAlign}
        />
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className="w-full flex justify-center">
          <div className="w-full max-w-screen-2xl px-6">
            <Ruler zoom={zoom} pageMargin={pageMargin} onChangeMargin={setPageMargin} />
            <div className="my-6 flex justify-center">
              <EditorPage
                zoom={zoom}
                pageMargin={pageMargin}
                fontFamily={fontFamily}
                fontSize={fontSize}
                bold={bold}
                italic={italic}
                underline={underline}
                align={align}
                document={currentDocument}
                onTextChange={onTextChange}
                isConnected={isConnected}
                isLoading={false}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
