'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/3d/ControlPanel';
import ExportBar from '@/components/3d/ExportBar';
import { useEditorStore } from '@/lib/store';

// Dynamic import for the 3D viewer (SSR-incompatible)
const ReliefViewer = dynamic(() => import('@/components/3d/ReliefViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0c1013]">
      <span className="font-mono text-dim text-sm">Loading 3D viewport...</span>
    </div>
  ),
});

function HUD() {
  const img = useEditorStore((s) => s.img);
  const imgName = useEditorStore((s) => s.imgName);
  const settings = useEditorStore((s) => s.settings);

  if (!img) {
    return (
      <div className="absolute top-[14px] left-[14px] font-mono text-[11px] text-dim pointer-events-none leading-[1.7]">
        NO IMAGE LOADED
        <br />
        <span className="text-dim">load one to begin</span>
      </div>
    );
  }

  return (
    <div className="absolute top-[14px] left-[14px] font-mono text-[11px] text-dim pointer-events-none leading-[1.7]">
      {imgName || 'image'} · {settings.gc}×{settings.gr} grid
      <br />
      <b className="text-accent2">{settings.out}</b>
      {settings.join ? ' · interlocking' : ''}
      {settings.colorOn ? ` · ${settings.nc} colors` : ''}
      {' · drag/scroll'}
    </div>
  );
}

function SourcePreview() {
  const img = useEditorStore((s) => s.img);
  const heightGrid = useEditorStore((s) => s.heightGrid);
  const settings = useEditorStore((s) => s.settings);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!img || !heightGrid || !canvasRef.current) return;
    const sc = canvasRef.current;
    const sx = sc.getContext('2d');
    if (!sx) return;
    const hg = heightGrid;

    sx.fillStyle = '#000';
    sx.fillRect(0, 0, 120, 120);

    // Draw the full image scaled into 120x120
    const fw = hg.fw;
    const fh = hg.fh;
    const s = Math.min(120 / fw, 120 / fh);
    const dw = fw * s;
    const dh = fh * s;
    const ox = (120 - dw) / 2;
    const oy = (120 - dh) / 2;

    // Need to get the source canvas content
    const srcCanvas = useEditorStore.getState().srcCanvas;
    if (srcCanvas) {
      sx.drawImage(srcCanvas, ox, oy, dw, dh);
    }

    // Draw selection rect
    const tw = Math.floor(fw / settings.gc);
    const th = Math.floor(fh / settings.gr);
    const cx0 = (settings.tcol - 1) * tw;
    const cx1 = settings.tcol === settings.gc ? fw : settings.tcol * tw;
    const rTop = settings.gr - settings.trow;
    const cy0 = rTop * th;
    const cy1 = rTop === settings.gr - 1 ? fh : (rTop + 1) * th;

    sx.strokeStyle = '#ff5c2b';
    sx.lineWidth = 2;
    sx.strokeRect(ox + cx0 * s, oy + cy0 * s, (cx1 - cx0) * s, (cy1 - cy0) * s);
  }, [img, heightGrid, settings.tcol, settings.trow, settings.gc, settings.gr]);

  if (!img) return null;

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      className="absolute bottom-[14px] right-[14px] w-[120px] border border-line bg-black"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function Toast() {
  const toast = useEditorStore((s) => s.toast);

  return (
    <div
      className={`absolute bottom-[70px] left-1/2 -translate-x-1/2 bg-accent2 text-[#06201b] font-mono text-[12px] py-[9px] px-4 rounded-sm pointer-events-none font-bold transition-opacity duration-250 ${
        toast ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {toast}
    </div>
  );
}

export default function EditorPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-line py-[14px] px-5 flex items-baseline gap-4 flex-wrap bg-gradient-to-b from-[#13181c] to-bg">
        <h1 className="font-heading text-[24px] tracking-[-0.5px] uppercase m-0">
          RELIEF<span className="text-accent">·</span>FORGE
        </h1>
        <span className="font-mono text-[11px] text-dim border border-line py-[3px] px-2 rounded-sm">
          IMG → RELIEF → STL
        </span>
        <div className="flex-1" />
        <div className="font-mono text-[10.5px] text-[#ffb020] max-w-[330px] leading-[1.4]">
          ⚠ You hold the rights to any image you load. Don&apos;t sell panels of copyrighted/trademarked characters.
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        <ControlPanel />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 min-h-0 relative">
            <ReliefViewer />
            <HUD />
            <SourcePreview />
            <Toast />
          </div>
          <ExportBar />
        </div>
      </div>
    </div>
  );
}
