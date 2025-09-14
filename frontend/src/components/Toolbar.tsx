import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';
import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
  Bars4Icon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { LuHighlighter } from 'react-icons/lu';
import {
  MdChecklist,
  MdFormatBold,
  MdFormatClear,
  MdFormatColorText,
  MdFormatIndentDecrease,
  MdFormatIndentIncrease,
  MdFormatItalic,
  MdFormatLineSpacing,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatUnderlined,
  MdInsertLink,
  MdOutlineAddComment,
  MdOutlineFormatPaint,
  MdOutlineInsertPhoto,
  MdOutlinePrint,
  MdRedo,
  MdSearch,
  MdSpellcheck,
  MdTranslate,
  MdUndo,
} from 'react-icons/md';

type Props = {
  zoom: number;
  setZoom: (v: number) => void;
  fontFamily: 'serif' | 'sans';
  setFontFamily: (v: 'serif' | 'sans') => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  bold: boolean;
  setBold: (v: boolean) => void;
  italic: boolean;
  setItalic: (v: boolean) => void;
  underline: boolean;
  setUnderline: (v: boolean) => void;
  align: 'left' | 'center' | 'right' | 'justify';
  setAlign: (v: 'left' | 'center' | 'right' | 'justify') => void;
};

export default function Toolbar(props: Props) {
  const {
    zoom,
    setZoom,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    bold,
    setBold,
    italic,
    setItalic,
    underline,
    setUnderline,
    align,
    setAlign,
  } = props;

  const [openZoomOption, setOpenZoomOption] = useState(false);
  const [zoomInput, setZoomInput] = useState(String(Math.round(zoom * 100)));
  const [openFontOption, setOpenFontOption] = useState(false);
  const [openTextAliginOption, setOpenTextAliginOption] = useState(false);

  const toHalfWidthNumber = (str: string) => {
    return str.replace(/[０-９]/g, s =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
  };

  const buttonLayout1 =
    'size-8 aspect-square flex items-center justify-center hover:bg-blue-200 rounded';
  const buttonLayout2 =
    'size-8 aspect-square flex items-center justify-center rounded font-bold';

  const buttonGroup1 = [
    { id: 'search', icon: MdSearch, label: 'メニューを検索' },
    { id: 'undo', icon: MdUndo, label: '元に戻す' },
    { id: 'redo', icon: MdRedo, label: 'やり直し' },
    { id: 'print', icon: MdOutlinePrint, label: '印刷' },
    { id: 'correction', icon: MdSpellcheck, label: 'スペルと文法のチェック' },
    {
      id: 'formatPainter',
      icon: MdOutlineFormatPaint,
      label: '書式を張り付け',
    },
  ];

  const buttonGroup2 = [
    {
      id: 'bold',
      state: bold,
      onClick: () => setBold(!bold),
      icon: MdFormatBold,
      label: '太字',
    },
    {
      id: 'italic',
      state: italic,
      onClick: () => setItalic(!italic),
      icon: MdFormatItalic,
      label: '斜体',
    },
    {
      id: 'underline',
      state: underline,
      onClick: () => setUnderline(!underline),
      icon: MdFormatUnderlined,
      label: '下線',
    },
    { id: 'textColor', icon: MdFormatColorText, label: 'テキストの色' },
    { id: 'highlightColor', icon: LuHighlighter, label: 'ハイライトの色' },
  ];

  const buttonGroup3 = [
    { id: 'addLink', icon: MdInsertLink, label: 'リンクを挿入' },
    { id: 'addComment', icon: MdOutlineAddComment, label: 'コメントを追加' },
    { id: 'addImage', icon: MdOutlineInsertPhoto, label: '画像の挿入' },
  ];
  const buttonGroup4 = [
    {
      id: 'lineSpacingMenuButton',
      icon: MdFormatLineSpacing,
      label: '行間隔と段落の間隔',
      chevron: true,
    },
    {
      id: 'addChecklistButton',
      icon: MdChecklist,
      label: 'チェックリスト',
      chevron: false,
    },
    {
      id: 'addBulletButton',
      icon: MdFormatListBulleted,
      label: '箇条書き',
      chevron: true,
    },
    {
      id: 'addNumberedBulletButton',
      icon: MdFormatListNumbered,
      label: '番号付リスト',
      chevron: true,
    },
    {
      id: 'outdentButton',
      icon: MdFormatIndentDecrease,
      label: 'インデント減',
      chevron: false,
    },
    {
      id: 'indentButton',
      icon: MdFormatIndentIncrease,
      label: 'インデント増',
      chevron: false,
    },
    {
      id: 'clearFormattingButton',
      icon: MdFormatClear,
      label: '書式をクリア',
      chevron: false,
    },
  ];

  const zoomOptions = [50, 75, 90, 100, 125, 150, 200];
  useEffect(() => {
    setZoomInput(String(Math.round(zoom * 100)));
  }, [zoom]);
  const applyZoom = () => {
    const halfWidth = toHalfWidthNumber(zoomInput);

    let val = Number(halfWidth);
    if (isNaN(val)) return;

    if (val < 50) val = 50;
    if (val > 200) val = 200;

    setZoom(val / 100);
    setZoomInput(String(val));
  };

  const fontFamilyOptions = ['sans', 'serif'] as const;

  const textAliginOptions = [
    { pos: 'left', icon: Bars3BottomLeftIcon },
    { pos: 'center', icon: Bars3Icon },
    { pos: 'right', icon: Bars3BottomRightIcon },
    { pos: 'justify', icon: Bars4Icon },
  ] as const;

  const chevronLayout = 'w-4 aspect-square';

  return (
    <div className="mx-auto my-1.5 rounded-full max-w-screen-2xl px-4 h-10 flex items-center gap-[1px] bg-blue-100 ">
      {buttonGroup1.map(({ id, icon: Icon, label }) => (
        <button key={id} className={buttonLayout1} title={label}>
          <Icon className="size-4 aspect-square" />
        </button>
      ))}

      {/* ズーム設定 */}
      <div className="relative my-1 w-18 text-sm flex">
        <input
          type="number"
          min={50}
          max={200}
          className={`w-full rounded px-1 py-px text-left cursor-pointer ${openZoomOption && 'bg-blue-200'}`}
          value={zoomInput}
          onChange={e => setZoomInput(e.target.value)}
          onBlur={applyZoom}
          onFocus={() => setOpenZoomOption(!openZoomOption)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              applyZoom();
              e.currentTarget.blur();
            }
            setOpenZoomOption(!openZoomOption);
          }}
        />
        <button
          type="button"
          className="flex items-center ml-1"
          onClick={() => setOpenZoomOption(!openZoomOption)}
        >
          <span className="px-1">%</span>
          {openZoomOption ? (
            <ChevronUpIcon className={chevronLayout} />
          ) : (
            <ChevronDownIcon className={chevronLayout} />
          )}
        </button>
        {openZoomOption && (
          <ul className="absolute z-10 top-8 mt-1 w-full bg-white rounded shadow">
            {zoomOptions.map(opt => (
              <li
                key={opt}
                className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                onClick={() => {
                  setZoom(opt / 100);
                  setOpenZoomOption(false);
                }}
              >
                {opt}%
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="w-px h-5 mx-1 bg-slate-600" />

      {/* フォント選択 */}
      <div className="relative my-1 w-28 text-sm flex">
        <input
          type="text"
          className={`w-full rounded px-1 py-px text-left cursor-pointer ${openFontOption && 'bg-blue-200'}`}
          value={fontFamily}
          readOnly
          onClick={() => setOpenFontOption(!openFontOption)}
        />
        <button
          type="button"
          className="flex items-center ml-1"
          onClick={() => setOpenFontOption(!openFontOption)}
        >
          {openFontOption ? (
            <ChevronUpIcon className={chevronLayout} />
          ) : (
            <ChevronDownIcon className={chevronLayout} />
          )}
        </button>

        {openFontOption && (
          <ul className="absolute z-10 top-8 mt-1 w-full bg-white rounded shadow">
            {fontFamilyOptions.map(opt => (
              <li
                key={opt}
                className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                onClick={() => {
                  setFontFamily(opt);
                  setOpenFontOption(false);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="w-px h-5 mx-1 bg-slate-600" />

      {/* フォントサイズ */}
      <div className="flex items-center text-xs">
        <button
          onClick={() => {
            if (fontSize > 1) {
              setFontSize(fontSize - 1);
            }
          }}
          className={buttonLayout1}
        >
          −
        </button>
        <input
          type="text"
          className="w-8 p-1 mx-1 border rounded flex text-center"
          value={fontSize}
          onChange={e => {
            setFontSize(Number(toHalfWidthNumber(e.target.value)) || 0);
          }}
          onBlur={() => {
            let val = Number(toHalfWidthNumber(String(fontSize)));
            if (isNaN(val)) return;
            if (val < 1) val = 1;
            if (val > 400) val = 400;
            setFontSize(val);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              let val = Number(toHalfWidthNumber(String(fontSize)));
              if (isNaN(val)) return;
              if (val < 1) val = 1;
              if (val > 400) val = 400;
              setFontSize(val);
              e.currentTarget.blur();
            }
          }}
        />
        <button
          onClick={() => {
            if (fontSize < 400) {
              setFontSize(fontSize + 1);
            }
          }}
          className={buttonLayout1}
        >
          ＋
        </button>
      </div>

      <div className="w-px h-5 mx-1 bg-slate-600" />

      {/* スタイルボタン */}
      {buttonGroup2.map(({ id, state, onClick, icon: Icon, label }) => (
        <button
          key={id}
          className={clsx(
            buttonLayout2,
            state ? 'bg-blue-200' : 'hover:bg-blue-200'
          )}
          title={label}
          onClick={onClick}
        >
          <Icon className="size-4 aspect-square" />
        </button>
      ))}

      <div className="w-px h-5 mx-1 bg-slate-600" />

      {buttonGroup3.map(({ id, icon: Icon, label }) => (
        <button key={id} className={buttonLayout1} title={label}>
          <Icon className="size-4 aspect-square" />
        </button>
      ))}

      <div className="w-px h-5 mx-1 bg-slate-600" />

      {/* 配置 */}
      <div className="relative">
        <button
          type="button"
          className={clsx(
            'h-8 p-1 flex items-center rounded hover:bg-blue-200',
            openTextAliginOption && 'bg-blue-200'
          )}
          onClick={() => setOpenTextAliginOption(!openTextAliginOption)}
        >
          {(() => {
            const current = textAliginOptions.find(opt => opt.pos === align);
            if (!current) return null;
            const Icon = current.icon;
            return <Icon className="w-4 h-4" />;
          })()}
          {openTextAliginOption ? (
            <ChevronUpIcon className={chevronLayout} />
          ) : (
            <ChevronDownIcon className={chevronLayout} />
          )}
        </button>

        {openTextAliginOption && (
          <ul className="absolute z-10 mt-1 p-1 bg-white rounded shadow flex">
            {textAliginOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <li key={opt.pos}>
                  <button
                    className={`p-2 hover:bg-blue-100 ${opt.pos === align && 'bg-blue-200'}`}
                    onClick={() => {
                      setAlign(opt.pos);
                      setOpenTextAliginOption(false);
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* その他アイコン */}
      {buttonGroup4.map(({ id, icon: Icon, chevron, label }) => (
        <button
          key={id}
          className={'flex hover:bg-blue-200 rounded'}
          title={label}
        >
          <div className="size-8 aspect-square flex items-center justify-center">
            <Icon className="size-4 aspect-square" />
          </div>
          {chevron && <ChevronDownIcon className={chevronLayout} />}
        </button>
      ))}
      <div className="w-px h-5 mx-1 bg-slate-600" />
      <button
        key="inputToolsToggleButton"
        className={'flex hover:bg-blue-200 rounded'}
        title="入力ツール"
      >
        <div className="size-8 aspect-square flex items-center justify-center">
          <MdTranslate className="size-4 aspect-square" />
        </div>
        <ChevronDownIcon className={chevronLayout} />
      </button>

      <div className="flex items-center ml-auto">
        <button
          key="toolbarModeSwitcher"
          className={'flex hover:bg-blue-200 rounded'}
          title="編集モード"
        >
          <div className="size-8 aspect-square flex items-center justify-center">
            <PencilIcon className="size-4 aspect-square" />
          </div>
          <ChevronDownIcon className={chevronLayout} />
        </button>
        <div className="w-px h-5 mx-1 bg-slate-600" />
        <button
          key={'viewModeButton'}
          className={buttonLayout1}
          title={'メニューを非表示'}
        >
          <ChevronUpIcon className="size-4 aspect-square" />
        </button>
      </div>
    </div>
  );
}
