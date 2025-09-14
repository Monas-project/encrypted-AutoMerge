'use client'
import { useState } from 'react';
import TopBar from '@/components/TopBar';
import Toolbar from '@/components/Toolbar';
import Ruler from '@/components/Ruler';
import EditorPage from '@/components/EditorPage';

export default function Page() {
  const [title, setTitle] = useState('無題のドキュメント');
  const [zoom, setZoom] = useState(1);
  const [pageMargin, setPageMargin] = useState({ left: 96, right: 96 });
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('sans');
  const [fontSize, setFontSize] = useState(14);
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);

  const [apiResult, setApiResult] = useState<string>("");
  const [wasmResult, setWasmResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
              />
            </div>
          </div>
        </div>
      </div>

    </div>
    </>
  );
};
