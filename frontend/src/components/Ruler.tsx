'use client';
import { useMemo, useRef, useEffect } from 'react';

type Props = {
  zoom: number;
  pageMargin: { left: number; right: number };
  onChangeMargin: (v: { left: number; right: number }) => void;
};

export default function Ruler({ zoom, pageMargin, onChangeMargin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const width = 816;
  const height = 16;
  const dpr =
    typeof window !== 'undefined'
      ? Math.min(2, window.devicePixelRatio || 1)
      : 1;

  // 目盛データを生成
  const ticks = useMemo(() => {
    const perInch = 96;
    const major = perInch;
    const minor = perInch / 2;
    const small = perInch / 8;
    const arr: {
      x: number;
      type: 'major' | 'minor' | 'small';
      label?: string;
    }[] = [];
    const extra = 100;
    for (let x = 0; x <= width; x += small) {
      if (x % major === 0)
        arr.push({ x, type: 'major', label: String(Math.round(x / perInch)) });
      else if (x % minor === 0) arr.push({ x, type: 'minor' });
      else arr.push({ x, type: 'small' });
    }
    return arr;
  }, []);

  // ルーラー描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * zoom * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width * zoom}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width * zoom, height);

    // 目盛線
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    for (const t of ticks) {
      const xPx = t.x * zoom;
      const H = t.type === 'major' ? 6 : t.type === 'minor' ? 5 : 3;

      ctx.moveTo(xPx + 0.5, height);
      ctx.lineTo(xPx + 0.5, height - H);

      if (t.type === 'major' && t.label) {
        const text = t.label;
        const textWidth = ctx.measureText(text).width;
        const canvasPx = width * zoom;

        const half = textWidth / 2;
        if (xPx - half < 0 || xPx + half > canvasPx) {
          continue;
        }

        ctx.fillText(text, xPx - half, 8);
      }
    }
    ctx.stroke();

    // 余白ガイド
    ctx.fillStyle = 'rgba(26,115,232,0.1)';
    ctx.fillRect(0, 0, pageMargin.left * zoom, height);
    ctx.fillRect(
      (width - pageMargin.right) * zoom,
      0,
      pageMargin.right * zoom,
      height
    );

    // ハンドル
    const handleW = 6;
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(pageMargin.left * zoom - handleW / 2, 0, handleW, height);
    ctx.fillRect(
      (width - pageMargin.right) * zoom - handleW / 2,
      0,
      handleW,
      height
    );
  }, [zoom, pageMargin, ticks, dpr]);

  // ドラッグで余白を調整
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let dragging: 'left' | 'right' | null = null;

    const handleDown = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const leftX = pageMargin.left * zoom;
      const rightX = (width - pageMargin.right) * zoom;
      if (Math.abs(x - leftX) < 8) dragging = 'left';
      else if (Math.abs(x - rightX) < 8) dragging = 'right';
    };

    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      if (dragging === 'left') {
        const val = Math.max(24, Math.min(192, x));
        onChangeMargin({ ...pageMargin, left: Math.round(val) });
      } else {
        const val = Math.max(24, Math.min(192, width - x));
        onChangeMargin({ ...pageMargin, right: Math.round(val) });
      }
    };

    const handleUp = () => {
      dragging = null;
    };

    el.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      el.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [zoom, pageMargin, onChangeMargin]);

  return (
    <div className="flex justify-center">
      <div className="min-w-screen flex justify-center border-b border-slate-400 rounded overflow-hidden ">
        <canvas ref={canvasRef} className="" style={{ display: 'block' }} />
      </div>
    </div>
  );
}
