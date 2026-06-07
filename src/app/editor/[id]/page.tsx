'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ControlPanel from '@/components/3d/ControlPanel';
import ExportBar from '@/components/3d/ExportBar';
import ExportPanel from '@/components/export/ExportPanel';
import ShareModal from '@/components/share/ShareModal';
import { useEditorStore } from '@/lib/store';
import type { PreviewMode } from '@/components/3d/ReliefViewer';

// Dynamic import for the 3D viewer (SSR-incompatible)
const ReliefViewer = dynamic<{ previewMode: PreviewMode }>(() => import('@/components/3d/ReliefViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0c1013]">
      <span className="font-mono text-dim text-sm">Loading 3D viewport...</span>
    </div>
  ),
});

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

function HUD({ previewMode }: { previewMode: PreviewMode }) {
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
      {previewMode === 'all' ? ' · all tiles' : ` · tile ${settings.tcol}·${settings.trow}`}
      {settings.puzzleOn ? ' · snap-lock' : settings.join ? ' · interlocking' : ''}
      {settings.colorOn ? ` · ${settings.nc} colors` : ''}
      {' · drag/scroll'}
    </div>
  );
}

function SourcePreview({ previewMode }: { previewMode: PreviewMode }) {
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

    // Draw grid and selected tile.
    const tw = Math.floor(fw / settings.gc);
    const th = Math.floor(fh / settings.gr);
    sx.strokeStyle = previewMode === 'all' ? '#30e0c0' : '#3d484f';
    sx.lineWidth = 1;
    for (let c = 1; c < settings.gc; c++) {
      const x = ox + c * tw * s;
      sx.beginPath();
      sx.moveTo(x, oy);
      sx.lineTo(x, oy + dh);
      sx.stroke();
    }
    for (let r = 1; r < settings.gr; r++) {
      const y = oy + r * th * s;
      sx.beginPath();
      sx.moveTo(ox, y);
      sx.lineTo(ox + dw, y);
      sx.stroke();
    }

    const cx0 = (settings.tcol - 1) * tw;
    const cx1 = settings.tcol === settings.gc ? fw : settings.tcol * tw;
    const rTop = settings.gr - settings.trow;
    const cy0 = rTop * th;
    const cy1 = rTop === settings.gr - 1 ? fh : (rTop + 1) * th;

    sx.strokeStyle = '#ff5c2b';
    sx.lineWidth = 2;
    sx.strokeRect(ox + cx0 * s, oy + cy0 * s, (cx1 - cx0) * s, (cy1 - cy0) * s);
  }, [img, heightGrid, previewMode, settings.tcol, settings.trow, settings.gc, settings.gr]);

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

function SaveIndicator({ status }: { status: SaveStatus }) {
  const colorMap: Record<SaveStatus, string> = {
    saved: 'text-accent2',
    saving: 'text-[#ffb020]',
    error: 'text-red-400',
    idle: 'text-dim',
  };

  const labelMap: Record<SaveStatus, string> = {
    saved: '✓ Saved',
    saving: 'Saving...',
    error: '✕ Save failed',
    idle: '',
  };

  if (status === 'idle') return null;

  return (
    <span className={`font-mono text-[11px] ${colorMap[status]} transition-colors`}>
      {labelMap[status]}
    </span>
  );
}

export default function EditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const settings = useEditorStore((s) => s.settings);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [editingName, setEditingName] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loadError, setLoadError] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('tile');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSettingsRef = useRef<string>('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(true);

  // Load project on mount — reset store first to avoid stale state
  useEffect(() => {
    let cancelled = false;
    isLoadingRef.current = true;
    useEditorStore.getState().reset();
    useEditorStore.setState({ isLoading: true });
    lastSettingsRef.current = '';

    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (!res.ok) {
          if (cancelled) return;
          setLoadError(true);
          return;
        }
        const project = await res.json();
        if (cancelled) return;

        setProjectName(project.name);

        // If project has settings, apply them all at once (bulk) to avoid N refreshes
        if (project.settings && Object.keys(project.settings).length > 0) {
          const validSettings: Record<string, any> = {};
          const store = useEditorStore.getState();
          Object.entries(project.settings).forEach(([key, value]) => {
            if (key in store.settings) {
              validSettings[key] = value;
            }
          });
          useEditorStore.getState().setSettings(validSettings);
        }

        // If project has an imageId, load the image
        console.log('[Editor] Project imageId:', project.imageId);
        if (project.imageId) {
          try {
            // First get image metadata
            const imgRes = await fetch(`/api/images/${project.imageId}`);
            console.log('[Editor] Image metadata response:', imgRes.status);
            if (imgRes.ok) {
              const imageData = await imgRes.json();
              console.log('[Editor] Image found:', imageData.originalName, imageData.url ? 'has-url' : 'no-url');
              // Fetch image content through our server proxy (?download=true)
              // This avoids R2 CORS issues entirely — the server fetches from R2
              // and streams to the browser as same-origin
              const blobRes = await fetch(`/api/images/${project.imageId}?download=true`);
              console.log('[Editor] Image download response:', blobRes.status);
              if (blobRes.ok) {
                const blob = await blobRes.blob();
                console.log('[Editor] Image blob size:', blob.size, 'type:', blob.type);
                const blobUrl = URL.createObjectURL(blob);
                const im = new Image();
                im.onload = () => {
                  console.log('[Editor] Image loaded into HTMLImage:', im.width, 'x', im.height);
                  if (!cancelled) {
                    useEditorStore.getState().setImage(im, imageData.originalName);
                  }
                };
                im.onerror = () => {
                  console.error('Failed to decode project image blob');
                };
                im.src = blobUrl;
              } else {
                const errText = await blobRes.text();
                console.error('[Editor] Image download failed:', blobRes.status, errText);
              }
            }
          } catch (err) {
            console.error('Failed to load project image:', err);
          }
        } else {
          console.log('[Editor] No imageId on project — image was never saved');
        }
      } catch (e) {
        console.error('Failed to load project:', e);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) {
          // Sync lastSettingsRef BEFORE clearing isLoadingRef to prevent
          // the auto-save effect from firing between the two updates.
          lastSettingsRef.current = JSON.stringify(useEditorStore.getState().settings);
          isLoadingRef.current = false;
          useEditorStore.setState({ isLoading: false });
        }
      }
    }

    loadProject();
    return () => { cancelled = true; };
  }, [params.id]);

  // Auto-save on settings change (debounced 1000ms) — skipped during initial load
  useEffect(() => {
    // Don't auto-save while project is still loading
    if (isLoadingRef.current) return;

    const settingsStr = JSON.stringify(settings);

    // Skip if settings haven't changed
    if (settingsStr === lastSettingsRef.current) return;
    lastSettingsRef.current = settingsStr;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        });
        if (res.ok) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [settings, params.id]);

  // Auto-save name changes (debounced)
  const handleNameBlur = useCallback(async () => {
    setEditingName(false);
    const trimmed = projectName.trim() || 'Untitled Project';
    setProjectName(trimmed);

    try {
      await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch (e) {
      // silent fail for name save
    }
  }, [projectName, params.id]);

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      nameInputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setEditingName(false);
    }
  };

  // Thumbnail capture moved to export — no more 30-second timer

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="font-heading text-xl text-ink">Project not found</h1>
        <Link href="/dashboard" className="text-accent text-sm hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-line py-[14px] px-5 flex items-baseline gap-4 flex-wrap bg-gradient-to-b from-[#13181c] to-bg">
        <Link
          href="/dashboard"
          className="font-heading text-[24px] tracking-[-0.5px] uppercase m-0 hover:text-accent transition-colors"
        >
          RELIEF<span className="text-accent">·</span>FORGE
        </Link>
        <span className="font-mono text-[11px] text-dim border border-line py-[3px] px-2 rounded-sm hidden sm:inline">
          IMG → RELIEF → STL
        </span>

        {/* Editable project name */}
        <div className="flex items-center gap-2 ml-2">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="font-mono text-sm text-ink bg-panel border border-accent px-2 py-0.5 rounded focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="font-mono text-sm text-dim hover:text-ink hover:bg-panel px-2 py-0.5 rounded transition-colors"
              title="Click to rename"
            >
              {projectName}
            </button>
          )}
          <SaveIndicator status={saveStatus} />
        </div>

        <div className="flex-1" />
        <button
          onClick={() => setShareModalOpen(true)}
          className="font-mono text-[11px] text-dim hover:text-accent border border-line hover:border-accent px-3 py-1.5 rounded transition-colors"
        >
          ⤴ Share
        </button>
        <Link
          href="/dashboard"
          className="font-mono text-[11px] text-dim hover:text-ink transition-colors"
        >
          ← Dashboard
        </Link>
        <div className="font-mono text-[10.5px] text-[#ffb020] max-w-[330px] leading-[1.4] hidden md:block">
          ⚠ You hold the rights to any image you load. Don&apos;t sell panels of copyrighted/trademarked characters.
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        <ControlPanel projectId={params.id} />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 min-h-0 relative flex flex-col">
            <ReliefViewer previewMode={previewMode} />
            <HUD previewMode={previewMode} />
            <SourcePreview previewMode={previewMode} />
            <Toast />
          </div>
          <ExportBar
            projectId={params.id}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />
          <ExportPanel projectId={params.id} />
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          projectId={params.id}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
