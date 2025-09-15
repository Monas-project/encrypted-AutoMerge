'use client'
import { useEffect, useState } from 'react'
import { initializeServices, connectToDocument, setKeyForDocument, setupDocumentUpdateListener, getShareLink } from '../actions'
import { Document } from '@/application/types/Document'
import TopBar from '@/components/TopBar'
import Toolbar from '@/components/Toolbar'
import Ruler from '@/components/Ruler'
import EditorPage from '@/components/EditorPage'

export default function ClientDocPage() {
  const [doc, setDoc] = useState<Document | null>(null)
  const [title, setTitle] = useState('無題のドキュメント')
  const [zoom, setZoom] = useState(1)
  const [pageMargin, setPageMargin] = useState({ left: 96, right: 96 })
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('sans')
  const [fontSize, setFontSize] = useState(14)
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        await initializeServices()
        const routeDocId = typeof window !== 'undefined'
          ? (new URLSearchParams(window.location.search).get('doc_id')
              || (window.location.pathname.split('/')[2] || ''))
          : ''
        if (!routeDocId) {
          setError('URLにdoc_idが含まれていません。')
          return
        }
        const h = typeof window !== 'undefined' ? window.location.hash : ''
        const hash = new URLSearchParams(h && h.startsWith('#') ? h.slice(1) : h)
        const key = hash.get('k')
        if (!key) {
          setError('共有URLに鍵(#k=...)が含まれていません。')
          return
        }
        await setKeyForDocument(routeDocId, key)
        const d: Document = { id: routeDocId, text: '', timestamp: Date.now() }
        setDoc(d)
        setupDocumentUpdateListener((updated) => {
          if (updated.id === routeDocId) {
            setDoc(updated)
          }
        })
        await connectToDocument(d)
      } catch (e: any) {
        setError(e?.message || String(e))
      }
    })()
  }, [])

  if (error) {
    return <div className='p-6 text-red-600'>{error}</div>
  }
  if (!doc) {
    return <div className='p-6 text-slate-600'>共有ドキュメントを準備中...</div>
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-800">
      <div className='flex-shrink-0'>
        <TopBar
          title={title}
          onTitleChange={setTitle}
          zoom={zoom}
          onZoomChange={setZoom}
          onShareClick={async () => {
            try {
              const id = (doc?.id) || (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '')
              const url = await getShareLink(id)
              await navigator.clipboard.writeText(url)
              alert('共有リンクをコピーしました')
            } catch (e: any) {
              alert(`共有リンクの生成に失敗: ${e?.message || String(e)}`)
            }
          }}
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
                document={doc}
                onTextChange={() => {}}
                isConnected={true}
                isLoading={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


