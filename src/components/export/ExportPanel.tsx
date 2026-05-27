'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/lib/store';
import ExportHistory from './ExportHistory';

const FORMATS = ['STL', 'OBJ', '3MF'] as const;
const RESOLUTIONS = [150, 220, 300, 500, 1000];

interface ExportState {
  exporting: boolean;
  progress: number;
  exportId: string | null;
  status: string | null;
  url: string | null;
  error: string | null;
}

interface BatchState {
  exporting: boolean;
  progress: number;
  exportIds: string[];
  completed: number;
  total: number;
  error: string | null;
}

export default function ExportPanel({ projectId }: { projectId: string }) {
  const settings = useEditorStore((s) => s.settings);
  const img = useEditorStore((s) => s.img);
  const srcCanvas = useEditorStore((s) => s.srcCanvas);
  const showToast = useEditorStore((s) => s.showToast);

  const [format, setFormat] = useState<'STL' | 'OBJ' | 'THREE_MF'>('STL');
  const [resolution, setResolution] = useState(220);
  const [exportState, setExportState] = useState<ExportState>({
    exporting: false,
    progress: 0,
    exportId: null,
    status: null,
    url: null,
    error: null,
  });
  const [batchState, setBatchState] = useState<BatchState>({
    exporting: false,
    progress: 0,
    exportIds: [],
    completed: 0,
    total: 0,
    error: null,
  });

  // Get image data URL from the source canvas
  const getImageDataUrl = useCallback((): string | null => {
    if (!img || !srcCanvas) return null;
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return tempCanvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [img, srcCanvas]);

  // Poll export status
  const pollExport = useCallback(async (exportId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/export/${exportId}`);
        const data = await res.json();
        
        setExportState((prev) => ({
          ...prev,
          status: data.status,
          progress: data.progress || prev.progress,
          url: data.url,
          error: data.errorMsg,
          exporting: data.status === 'PENDING' || data.status === 'PROCESSING',
        }));

        if (data.status === 'PENDING' || data.status === 'PROCESSING') {
          setTimeout(poll, 2000);
        } else if (data.status === 'COMPLETED') {
          showToast('Export complete!');
        } else if (data.status === 'FAILED') {
          showToast('Export failed');
        }
      } catch (err) {
        setExportState((prev) => ({
          ...prev,
          exporting: false,
          error: 'Failed to check export status',
        }));
      }
    };
    poll();
  }, [showToast]);

  // Export single tile
  const handleExportTile = useCallback(async () => {
    const imageDataUrl = getImageDataUrl();
    if (!imageDataUrl) {
      showToast('No image loaded');
      return;
    }

    setExportState({
      exporting: true,
      progress: 0,
      exportId: null,
      status: 'PENDING',
      url: null,
      error: null,
    });

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          format,
          resolution,
          imageDataUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setExportState((prev) => ({
          ...prev,
          exporting: false,
          error: data.error || 'Export failed',
        }));
        return;
      }

      setExportState((prev) => ({
        ...prev,
        exportId: data.exportId,
      }));

      // Start polling
      pollExport(data.exportId);
    } catch (err: any) {
      setExportState((prev) => ({
        ...prev,
        exporting: false,
        error: err.message || 'Network error',
      }));
    }
  }, [projectId, format, resolution, getImageDataUrl, pollExport, showToast]);

  // Export all tiles
  const handleExportAll = useCallback(async () => {
    const imageDataUrl = getImageDataUrl();
    if (!imageDataUrl) {
      showToast('No image loaded');
      return;
    }

    setBatchState({
      exporting: true,
      progress: 0,
      exportIds: [],
      completed: 0,
      total: 0,
      error: null,
    });

    try {
      const res = await fetch('/api/export/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          format,
          resolution,
          gridCols: settings.gc,
          gridRows: settings.gr,
          imageDataUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBatchState((prev) => ({
          ...prev,
          exporting: false,
          error: data.error || 'Batch export failed',
        }));
        return;
      }

      setBatchState((prev) => ({
        ...prev,
        exportIds: data.exportIds,
        total: data.totalCount,
      }));

      // Poll batch status
      const pollBatch = async () => {
        try {
          const pollRes = await fetch(
            `/api/export/batch?exportIds=${data.exportIds.join(',')}`
          );
          const pollData = await pollRes.json();

          setBatchState((prev) => ({
            ...prev,
            progress: pollData.summary.progressPercent,
            completed: pollData.summary.completed,
            exporting: !pollData.summary.allDone,
          }));

          if (!pollData.summary.allDone) {
            setTimeout(pollBatch, 3000);
          } else {
            showToast(`Batch export complete: ${pollData.summary.completed} tiles`);
          }
        } catch {
          setBatchState((prev) => ({
            ...prev,
            exporting: false,
            error: 'Failed to check batch status',
          }));
        }
      };
      setTimeout(pollBatch, 2000);
    } catch (err: any) {
      setBatchState((prev) => ({
        ...prev,
        exporting: false,
        error: err.message || 'Network error',
      }));
    }
  }, [projectId, format, resolution, settings.gc, settings.gr, getImageDataUrl, showToast]);

  const hasImage = !!img;

  return (
    <div className="border-t border-line bg-panel px-4 py-3 space-y-3">
      {/* Format & Resolution selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Format segmented buttons */}
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] text-dim uppercase mr-1">Format</span>
          {FORMATS.map((f) => {
            const val = f === '3MF' ? 'THREE_MF' : f;
            return (
              <button
                key={f}
                onClick={() => setFormat(val as typeof format)}
                className={`font-mono text-[11px] px-2 py-1 rounded-sm border transition-all ${
                  format === val
                    ? 'bg-accent text-[#160a05] border-accent font-bold'
                    : 'bg-panel2 text-dim border-line hover:border-accent hover:text-ink'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Resolution dropdown */}
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] text-dim uppercase mr-1">Res</span>
          <select
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            className="font-mono text-[11px] bg-panel2 text-ink border border-line rounded-sm px-2 py-1 cursor-pointer hover:border-accent"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {r}px
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          disabled={!hasImage || exportState.exporting || batchState.exporting}
          onClick={handleExportTile}
          className="font-mono text-[11.5px] tracking-[0.5px] border border-accent bg-accent text-[#160a05] py-[9px] px-3 rounded-sm cursor-pointer uppercase font-bold hover:brightness-[1.08] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {exportState.exporting ? (
            <span className="flex items-center gap-2">
              <Spinner /> Exporting...
            </span>
          ) : (
            '↓ Export This Tile'
          )}
        </button>

        <button
          disabled={!hasImage || exportState.exporting || batchState.exporting}
          onClick={handleExportAll}
          className="font-mono text-[11.5px] tracking-[0.5px] border border-line bg-panel2 text-ink py-[9px] px-3 rounded-sm cursor-pointer uppercase hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {batchState.exporting ? (
            <span className="flex items-center gap-2">
              <Spinner /> {batchState.completed}/{batchState.total}
            </span>
          ) : (
            `↓ Export All Tiles (${settings.gc}×${settings.gr})`
          )}
        </button>

        {/* Download button for completed single export */}
        {exportState.status === 'COMPLETED' && exportState.url && (
          <a
            href={exportState.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11.5px] tracking-[0.5px] border border-green-600 bg-green-600/20 text-green-400 py-[9px] px-3 rounded-sm cursor-pointer uppercase font-bold hover:bg-green-600/30 transition-all"
          >
            ↓ Download
          </a>
        )}
      </div>

      {/* Progress bar for batch */}
      {batchState.exporting && (
        <div className="w-full bg-panel2 rounded-sm h-2 overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${batchState.progress}%` }}
          />
        </div>
      )}

      {/* Error display */}
      {(exportState.error || batchState.error) && (
        <div className="font-mono text-[11px] text-red-400 bg-red-900/20 border border-red-800/50 rounded-sm px-3 py-2">
          {exportState.error || batchState.error}
        </div>
      )}

      {/* Export History */}
      <ExportHistory projectId={projectId} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3 inline-block" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
