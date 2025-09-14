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
} from './actions';

const DEFAULT_TITLE = '無題のドキュメント';


export default function Page() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [zoom, setZoom] = useState(1);
  const [pageMargin, setPageMargin] = useState({ left: 96, right: 96 });
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('sans');
  const [fontSize, setFontSize] = useState(14);
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);

  // Document state
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test state
  const [apiResult, setApiResult] = useState<string>("");
  const [wasmResult, setWasmResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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

  // Test functions
  async function callTest() {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/test`);
      const data = await res.json();
      setApiResult(JSON.stringify(data));
    } catch (e: any) {
      setApiResult(`error: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function runWasmOnTest() {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/test`);
      const data = await res.json();
      const moduleUrl = `${window.location.origin}/wasm/test_wasm/pkg/test_wasm.js`;
      // Avoid bundler resolution; load as runtime module from public/
      const mod: any = await import(/* webpackIgnore: true */ moduleUrl);
      if (mod.default) {
        await mod.default();
      }
      const decorated = mod.decorate_message(String(data.message ?? JSON.stringify(data)));
      setWasmResult(decorated);
    } catch (e: any) {
      setWasmResult(`error: ${e?.message || String(e)}`);
    }
  }

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
    <>
      {/* test buttons */}
      <button
              onClick={callTest}
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            >
              {loading ? "Testing..." : "Call /test"}
      </button>
      <button
        onClick={runWasmOnTest}
        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
      >
        Wasm decorate /test
      </button>

      {apiResult && (
          <pre className="text-xs p-3 bg-black/[.05] dark:bg-white/[.06] rounded w-full max-w-xl break-words whitespace-pre-wrap">
            {apiResult}
          </pre>
        )}
      {wasmResult && (
        <pre className="text-xs p-3 bg-black/[.05] dark:bg-white/[.06] rounded w-full max-w-xl break-words whitespace-pre-wrap">
          {wasmResult}
        </pre>
      )}
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
    </>
  );
}
