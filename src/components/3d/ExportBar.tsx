'use client';

import { useEditorStore } from '@/lib/store';

export default function ExportBar() {
  const geometry = useEditorStore((s) => s.geometry);
  const settings = useEditorStore((s) => s.settings);
  const img = useEditorStore((s) => s.img);
  const exportTile = useEditorStore((s) => s.exportTile);
  const exportAll = useEditorStore((s) => s.exportAll);
  const setResetView = useEditorStore((s) => s.setResetView);

  const hasImage = !!img;
  const hasGeo = !!geometry;

  return (
    <div className="border-t border-line py-3 px-4 flex gap-3 items-center bg-panel flex-wrap">
      <span className="font-mono text-[10px] text-dim uppercase tracking-wider">Quick Download</span>
      <button
        disabled={!hasImage}
        onClick={() => exportTile()}
        className="font-mono text-[12.5px] tracking-[0.5px] border border-accent bg-accent text-[#160a05] py-[11px] px-4 rounded-sm cursor-pointer uppercase font-bold hover:brightness-[1.08] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        ↓ Export this tile STL
      </button>

      <button
        disabled={!hasImage}
        onClick={() => exportAll()}
        className="font-mono text-[12.5px] tracking-[0.5px] border border-line bg-panel2 text-ink py-[11px] px-4 rounded-sm cursor-pointer uppercase hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        ↓ Export all tiles
      </button>

      <button
        onClick={() => setResetView(true)}
        className="font-mono text-[12.5px] tracking-[0.5px] border border-line bg-transparent text-ink py-[11px] px-4 rounded-sm cursor-pointer uppercase hover:border-accent transition-all"
      >
        Reset view
      </button>

      <div className="font-mono text-[11px] text-dim ml-auto">
        {hasGeo ? (
          <>
            tile <b className="text-ink">{settings.tcol}·{settings.trow}</b>
            &nbsp;&nbsp;
            {geometry.tris.toLocaleString()} tris
            &nbsp;&nbsp;
            <b className="text-ink">
              {geometry.bbox[0].toFixed(0)}×{geometry.bbox[1].toFixed(0)}×{geometry.bbox[2].toFixed(1)}
            </b>
            {' '}mm
          </>
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}
