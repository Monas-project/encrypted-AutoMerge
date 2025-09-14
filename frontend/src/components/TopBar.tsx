import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

type Props = {
  title: string;
  onTitleChange: (v: string) => void;
  zoom: number;
  onZoomChange: (v: number) => void;
  onShareClick?: () => void;
};

export default function TopBar({
  title,
  onTitleChange,
  zoom,
  onZoomChange,
  onShareClick,
}: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(0);

  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth + 8);
    }
  }, [title]);

  const inputClassName =
    'px-1.5 py-[1px] rounded text-lg font-normal leading-[20px] hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-300 min-w-0 max-w-[calc(100%-1rem)] overflow-hidden text-ellipsis whitespace-nowrap';
  const toolButtonDesignt = 'text-sm px-2 py-0.5 hover:bg-gray-200';

  return (
    <header className="min-w-screen h-16 flex items-center bg-white/90">
      <div className="h-[36px] aspect-square m-[14px] rounded grid place-items-center bg-blue-600 text-white font-bold">
        E
      </div>
      <div className="flex flex-col py-2 min-w-0">
        <input
          style={{ width: `${inputWidth}px` }}
          className={inputClassName}
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
              if (title.trim().length === 0) {
                onTitleChange('無題のドキュメント');
              }
            }
          }}
          onBlur={() => {
            if (title.trim().length === 0) {
              onTitleChange('無題のドキュメント');
            }
          }}
        />
        <span
          ref={spanRef}
          className={clsx('absolute invisible whitespace-pre', inputClassName)}
        >
          {title}
        </span>
        <div className="flex flex-wrap">
          <button className={toolButtonDesignt}>ファイル</button>
          <button className={toolButtonDesignt}>編集</button>
          <button className={toolButtonDesignt}>表示</button>
          <button className={toolButtonDesignt}>挿入</button>
          <button className={toolButtonDesignt}>表示形式</button>
          <button className={toolButtonDesignt}>ツール</button>
          <button className={toolButtonDesignt}>拡張機能</button>
          <button className={toolButtonDesignt}>ヘルプ</button>
        </div>
      </div>
      <div className="ml-auto pl-4 pr-3 flex items-center gap-2 shrink-0">
        <button
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded border hover:bg-slate-50"
          onClick={onShareClick}
          title="共有リンクをコピー"
        >
          共有
        </button>
        <div className="size-12 aspect-square p-2">
          <div className="aspect-square rounded-full bg-emerald-500 text-white grid place-items-center">
            K
          </div>
        </div>
      </div>
    </header>
  );
}
