'use client';
import { useEffect, useRef } from 'react';

type Props = {
    zoom: number
    pageMargin: { left: number; right: number }
    fontFamily: 'serif' | 'sans'
    fontSize: number
    bold: boolean
    italic: boolean
    underline: boolean
    align: 'left' | 'center' | 'right' | 'justify'
}

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
    } = props

    const ref = useRef<HTMLDivElement | null>(null)

    // スタイルを反映
    useEffect(() => {
        const el = ref.current
        if (!el) return
        el.style.setProperty(
            '--doc-font-family',
            fontFamily === 'serif'
                ? 'Times New Roman, Noto Serif JP, serif'
                : 'Inter, Noto Sans JP, system-ui, sans-serif'
        )
        el.style.setProperty('--doc-font-size', `${fontSize}px`)
        el.style.setProperty('--doc-font-weight', bold ? '700' : '400')
        el.style.setProperty('--doc-font-style', italic ? 'italic' : 'normal')
        el.style.setProperty('--doc-text-decoration', underline ? 'underline' : 'none')
        el.style.setProperty('--doc-text-align', align)
    }, [fontFamily, fontSize, bold, italic, underline, align])

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
                    className="w-full h-full overflow-auto focus:outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
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
                    <p className="mb-3">Enter text ...</p>
                </div>
            </div>

            {/* ページ番号 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-slate-400 text-sm">
                1 / 1
            </div>
        </div>
    )
}
