'use client';
import { useEffect, useRef } from 'react';
import { Document } from '@/application/types/Document';

type Props = {
  zoom: number;
  pageMargin: { left: number; right: number };
  fontFamily: 'serif' | 'sans';
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  document: Document | null;
  onTextChange: (text: string) => void;
  isConnected: boolean;
  isLoading: boolean;
};

export default function EditorPage(props: Props) {
  const {
    zoom,
    pageMargin,
    fontFamily,
    fontSize,
    bold,
    italic,
    underline,
    align,
    document,
    onTextChange,
    isConnected,
    isLoading,
  } = props;

  const ref = useRef<HTMLDivElement | null>(null);

  // スタイルを反映
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty(
      '--doc-font-family',
      fontFamily === 'serif'
        ? 'Times New Roman, Noto Serif JP, serif'
        : 'Inter, Noto Sans JP, system-ui, sans-serif'
    );
    el.style.setProperty('--doc-font-size', `${fontSize}px`);
    el.style.setProperty('--doc-font-weight', bold ? '700' : '400');
    el.style.setProperty('--doc-font-style', italic ? 'italic' : 'normal');
    el.style.setProperty(
      '--doc-text-decoration',
      underline ? 'underline' : 'none'
    );
    el.style.setProperty('--doc-text-align', align);
  }, [fontFamily, fontSize, bold, italic, underline, align]);

  // テキスト変更の処理
  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const text = event.currentTarget.textContent || '';
    onTextChange(text);
  };

  // ドキュメント内容の更新（リモート更新のみ）
  useEffect(() => {
    const el = ref.current;
    if (!el || !document) return;

    // 現在のテキストと異なる場合のみ更新
    if (el.textContent !== document.text) {
      // ローカル更新かどうかを判定（1秒以内の更新はローカル）
      const isLocalUpdate = document.timestamp > Date.now() - 1000;

      if (!isLocalUpdate) {
        // リモート更新の場合のみテキストを更新
        el.textContent = document.text;
        console.log('🔄 Remote update applied:', {
          textLength: document.text.length,
          timestamp: new Date(document.timestamp).toLocaleTimeString(),
        });
      } else {
        // ローカル更新の場合は何もしない（カーソル位置を保持）
        console.log('📝 Local update ignored to preserve cursor position');
      }
    }
  }, [document]);

  return (
    <div
      className="bg-white shadow-lg border border-slate-200 rounded relative"
      style={{
        width: `${816 * zoom}px`,
        height: `${1056 * zoom}px`,
        transformOrigin: 'top left',
      }}
    >
      {/* ページ余白 */}
      <div
        className="absolute inset-0"
        style={{
          paddingLeft: `${pageMargin.left * zoom}px`,
          paddingRight: `${pageMargin.right * zoom}px`,
          paddingTop: `${96 * zoom}px`,
          paddingBottom: `${96 * zoom}px`,
        }}
      >
        <div
          ref={ref}
          className="w-full h-full overflow-auto"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={handleInput}
          style={{
            fontFamily: 'var(--doc-font-family)',
            fontSize: 'var(--doc-font-size)',
            fontWeight: 'var(--doc-font-weight)' as any,
            fontStyle: 'var(--doc-font-style)' as any,
            textDecoration: 'var(--doc-text-decoration)',
            textAlign: 'var(--doc-text-align)' as any,
            lineHeight: 1.6,
          }}
        >
          {/* todo: うまく動作しない */}
          {document?.text || ''}
        </div>
      </div>

      {/* ページ番号 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-sm">
        1 / 1
      </div>

      {/* 接続状態表示 */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {isLoading && (
          <div className="flex items-center gap-1 text-blue-600 text-xs">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            同期中...
          </div>
        )}
        {isConnected && !isLoading && (
          <div className="flex items-center gap-1 text-green-600 text-xs">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            接続済み
          </div>
        )}
        {!isConnected && !isLoading && (
          <div className="flex items-center gap-1 text-red-600 text-xs">
            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
            未接続
          </div>
        )}
      </div>
    </div>
  );
}
