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
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
