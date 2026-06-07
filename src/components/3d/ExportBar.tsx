'use client';

import { useEditorStore } from '@/lib/store';
import { captureThumbnail } from '@/lib/thumbnail';

type PreviewMode = 'tile' | 'all';

export default function ExportBar({
  projectId,
  previewMode,
  onPreviewModeChange,
}: {
  projectId: string;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
}) {
  const geometry = useEditorStore((s) => s.geometry);
  const settings = useEditorStore((s) => s.settings);
  const img = useEditorStore((s) => s.img);
  const exportTile = useEditorStore((s) => s.exportTile);
  const exportAll = useEditorStore((s) => s.exportAll);
  const setResetView = useEditorStore((s) => s.setResetView);

  const hasImage = !!img;
  const hasGeo = !!geometry;

  const handleExportTile = () => {
    exportTile();
    captureThumbnail(projectId);
  };

  const handleExportAll = () => {
    exportAll();
    captureThumbnail(projectId);
  };

  return (
    <div className="border-t border-line py-3 px-4 flex gap-3 items-center bg-panel flex-wrap">
      <span className="font-mono text-[10px] text-dim uppercase tracking-wider">Quick Download</span>
      <div className="flex border border-line rounded-sm overflow-hidden">
        <button
          onClick={() => onPreviewModeChange('tile')}
          className={`font-mono text-[11px] uppercase tracking-[0.5px] px-3 py-[10px] transition-colors ${
            previewMode === 'tile'
              ? 'bg-accent2 text-[#06201b] font-bold'
              : 'bg-panel2 text-dim hover:text-ink'
          }`}
        >
          Tile View
        </button>
        <button
          onClick={() => onPreviewModeChange('all')}
          className={`font-mono text-[11px] uppercase tracking-[0.5px] px-3 py-[10px] border-l border-line transition-colors ${
            previewMode === 'all'
              ? 'bg-accent2 text-[#06201b] font-bold'
              : 'bg-panel2 text-dim hover:text-ink'
          }`}
        >
          All Tiles
        </button>
      </div>
      <button
        disabled={!hasImage}
        onClick={handleExportTile}
        className="font-mono text-[12.5px] tracking-[0.5px] border border-accent bg-accent text-[#160a05] py-[11px] px-4 rounded-sm cursor-pointer uppercase font-bold hover:brightness-[1.08] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        ↓ Export this tile STL
      </button>

      <button
        disabled={!hasImage}
        onClick={handleExportAll}
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
          previewMode === 'all' ? (
            <>
              all tiles <b className="text-ink">{settings.gc}×{settings.gr}</b>
              &nbsp;&nbsp;
              <b className="text-ink">{settings.gc * settings.gr}</b> pieces
            </>
          ) : (
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
          )
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}
