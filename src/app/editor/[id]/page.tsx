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

// Dynamic import for the 3D viewer (SSR-incompatible)
const ReliefViewer = dynamic(() => import('@/components/3d/ReliefViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0c1013]">
      <span className="font-mono text-dim text-sm">Loading 3D viewport...</span>
    </div>
  ),
});

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSettingsRef = useRef<string>('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load project on mount
  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setLoadError(true);
            return;
          }
          return;
        }
        const project = await res.json();
        if (cancelled) return;

        setProjectName(project.name);

        // If project has settings, populate the store
        if (project.settings && Object.keys(project.settings).length > 0) {
          const store = useEditorStore.getState();
          Object.entries(project.settings).forEach(([key, value]) => {
            if (key in store.settings) {
              store.setSetting(key as any, value as any);
            }
          });
        }

        // If project has an imageId, load the image
        if (project.imageId) {
          try {
            const imgRes = await fetch(`/api/images/${project.imageId}`);
            if (imgRes.ok) {
              const imageData = await imgRes.json();
              const im = new Image();
              im.crossOrigin = 'anonymous';
              im.onload = () => {
                if (!cancelled) {
                  useEditorStore.getState().setImage(im, imageData.originalName);
                }
              };
              im.src = imageData.url;
            }
          } catch (err) {
            console.error('Failed to load project image:', err);
          }
        }
      } catch (e) {
        console.error('Failed to load project:', e);
      }
    }

    loadProject();
    return () => { cancelled = true; };
  }, [params.id]);

  // Auto-save on settings change (debounced 1000ms)
  useEffect(() => {
    const settingsStr = JSON.stringify(settings);

    // Skip first render and if settings haven't changed
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

  // Capture thumbnail every 30 seconds
  useEffect(() => {
    thumbnailTimerRef.current = setInterval(async () => {
      try {
        // Find the Three.js canvas
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        if (!dataUrl || dataUrl === 'data:,') return;

        await fetch(`/api/projects/${params.id}/thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: dataUrl }),
        });
      } catch (e) {
        // silent fail for thumbnail save
      }
    }, 30000);

    return () => {
      if (thumbnailTimerRef.current) clearInterval(thumbnailTimerRef.current);
    };
  }, [params.id]);

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
            <ReliefViewer />
            <HUD />
            <SourcePreview />
            <Toast />
          </div>
          <ExportBar />
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
