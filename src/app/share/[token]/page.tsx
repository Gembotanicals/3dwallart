'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ReliefSettings,
  HeightGrid,
  GeometryResult,
  buildHeightGrid,
  buildGeometry,
  buildMoldGeometry,
  computeColors,
  computeBands,
  colorAttr,
} from '@/lib/relief-engine';
import { DEFAULT_SETTINGS } from '@/lib/store';

// ─── Types ───────────────────────────────────────────────────────
interface ShareData {
  projectName: string;
  settings: Record<string, any>;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  views: number;
  passwordProtected: boolean;
  expiresAt: string | null;
}

// ─── Shared Viewer Mesh ──────────────────────────────────────────
function SharedReliefMesh({
  geometry,
  colorData,
  pw,
  ph,
}: {
  geometry: GeometryResult | null;
  colorData: Float32Array | null;
  pw: number;
  ph: number;
}) {
  const bufferGeometry = useMemo(() => {
    if (!geometry) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(geometry.array, 3));
    if (colorData) {
      g.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
    }
    g.computeVertexNormals();
    g.translate(-pw / 2, -ph / 2, 0);
    return g;
  }, [geometry, colorData, pw, ph]);

  if (!bufferGeometry) return null;

  return (
    <mesh geometry={bufferGeometry}>
      <meshStandardMaterial
        color={colorData ? 0xffffff : 0xd8dde0}
        vertexColors={!!colorData}
        roughness={0.72}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function AutoRotateGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const [spinning, setSpinning] = useState(true);
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (spinning && groupRef.current) {
      groupRef.current.rotation.z += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {children}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        onStart={() => setSpinning(false)}
        enableDamping
        dampingFactor={0.08}
        minDistance={80}
        maxDistance={1600}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI - 0.15}
      />
    </group>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 42;
      camera.near = 1;
      camera.far = 5000;
      camera.up.set(0, 0, 1);
      camera.updateProjectionMatrix();
    }
  }, [camera]);
  return null;
}

// ─── Password Form ───────────────────────────────────────────────
function PasswordForm({
  token,
  onSubmit,
  error,
}: {
  token: string;
  onSubmit: (data: ShareData) => void;
  error?: string;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/share/${token}`, {
        headers: { 'x-share-password': password },
      });
      const data = await res.json();
      if (res.ok) {
        onSubmit(data);
      } else {
        setErrorMsg(data.error || 'Invalid password');
      }
    } catch {
      setErrorMsg('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101417] flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        <h1 className="font-heading text-2xl text-ink mb-2">Password Required</h1>
        <p className="text-dim text-sm mb-6">
          This shared relief has been password protected by the creator.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-panel border border-line text-ink px-4 py-3 rounded font-mono text-sm focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
          {errorMsg && (
            <p className="text-red-400 text-sm">{errorMsg}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-accent text-white py-3 rounded font-medium text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'View Relief'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Error States ────────────────────────────────────────────────
function ExpiredView() {
  return (
    <div className="min-h-screen bg-[#101417] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="font-heading text-2xl text-ink mb-2">Link Expired</h1>
        <p className="text-dim text-sm mb-6">
          This shared relief link has expired. Please contact the creator for a new link.
        </p>
        <Link
          href="/"
          className="inline-block bg-accent text-white px-6 py-3 rounded font-medium text-sm hover:bg-accent/90 transition-colors"
        >
          Visit ReliefForge
        </Link>
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen bg-[#101417] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="font-heading text-2xl text-ink mb-2">Link Not Found</h1>
        <p className="text-dim text-sm mb-6">
          This shared relief link doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-block bg-accent text-white px-6 py-3 rounded font-medium text-sm hover:bg-accent/90 transition-colors"
        >
          Visit ReliefForge
        </Link>
      </div>
    </div>
  );
}

// ─── Procedural Pattern Fallback ────────────────────────────────
function buildProceduralPattern(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) {
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      const v = Math.sin(nx * Math.PI * 3) * Math.cos(ny * Math.PI * 2) * 0.5 + 0.5;
      const c = Math.floor(v * 255);
      const idx = (y * canvas.width + x) * 4;
      imgData.data[idx] = c;
      imgData.data[idx + 1] = c;
      imgData.data[idx + 2] = c;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// ─── Main Shared Viewer ──────────────────────────────────────────
function SharedViewer({ data, token }: { data: ShareData; token: string }) {
  const settings = useMemo<ReliefSettings>(() => {
    const s = { ...DEFAULT_SETTINGS };
    if (data.settings && typeof data.settings === 'object') {
      Object.entries(data.settings).forEach(([key, value]) => {
        if (key in s) {
          (s as any)[key] = value;
        }
      });
    }
    return s;
  }, [data.settings]);

  const [geometry, setGeometry] = useState<GeometryResult | null>(null);
  const [colorData, setColorData] = useState<Float32Array | null>(null);
  const [tileCol, setTileCol] = useState(1);
  const [tileRow, setTileRow] = useState(1);
  const [viewMode, setViewMode] = useState<'PANEL' | 'MOLD'>('PANEL');
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load the original image if available, otherwise fall back to a procedural pattern
  useEffect(() => {
    if (!srcCanvasRef.current) {
      srcCanvasRef.current = document.createElement('canvas');
    }

    const canvas = srcCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const res = settings.res || 220;
    const gc = settings.gc || 1;
    const gr = settings.gr || 1;

    canvas.width = res * gc;
    canvas.height = res * gr;

    const buildFromSource = (img: HTMLImageElement) => {
      // Draw the source image into the canvas at the correct resolution
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      imgRef.current = img;
      rebuildGeometry(img, canvas, settings, tileCol, tileRow, viewMode);
      setLoaded(true);
    };

    if (data.imageUrl) {
      // Load the actual project image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => buildFromSource(img);
      img.onerror = () => {
        // Fall back to procedural pattern if image fails to load
        buildProceduralPattern(ctx, canvas);
        const fallbackImg = new Image();
        fallbackImg.onload = () => buildFromSource(fallbackImg);
        fallbackImg.src = canvas.toDataURL();
      };
      img.src = data.imageUrl;
    } else {
      // No image available — generate a procedural placeholder
      buildProceduralPattern(ctx, canvas);
      const img = new Image();
      img.onload = () => buildFromSource(img);
      img.src = canvas.toDataURL();
    }
  }, [data.imageUrl]);

  const rebuildGeometry = useCallback(
    (
      img: HTMLImageElement,
      canvas: HTMLCanvasElement,
      s: ReliefSettings,
      tc: number,
      tr: number,
      mode: 'PANEL' | 'MOLD'
    ) => {
      const localSettings = { ...s, tcol: tc, trow: tr, out: mode };
      const hg = buildHeightGrid(img, canvas, localSettings);
      if (!hg) return;
      const geo =
        mode === 'MOLD'
          ? buildMoldGeometry(hg, localSettings)
          : buildGeometry(hg, localSettings);
      if (!geo) return;

      let cd: Float32Array | null = null;
      if (mode === 'PANEL' && s.colorOn) {
        const colors = computeColors(img, s.nc);
        const bands = computeBands(img, s);
        cd = colorAttr(geo, colors, bands, s.base, s.relief);
      }

      setGeometry(geo);
      setColorData(cd);
    },
    []
  );

  const handleTileChange = (col: number, row: number) => {
    setTileCol(col);
    setTileRow(row);
    if (imgRef.current && srcCanvasRef.current) {
      rebuildGeometry(imgRef.current, srcCanvasRef.current, settings, col, row, viewMode);
    }
  };

  const handleViewToggle = () => {
    const newMode = viewMode === 'PANEL' ? 'MOLD' : 'PANEL';
    setViewMode(newMode);
    if (imgRef.current && srcCanvasRef.current) {
      rebuildGeometry(
        imgRef.current,
        srcCanvasRef.current,
        settings,
        tileCol,
        tileRow,
        newMode
      );
    }
  };

  const isGrid = (settings.gc || 1) > 1 || (settings.gr || 1) > 1;

  return (
    <div className="flex flex-col h-screen bg-[#0c1013]">
      {/* Full screen 3D viewer */}
      <div className="flex-1 relative min-h-0">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="font-mono text-dim text-sm">Loading 3D viewer...</span>
          </div>
        )}
        <Canvas
          gl={{ antialias: true }}
          dpr={[1, 2]}
          style={{ background: '#0c1013' }}
        >
          <CameraSetup />
          <ambientLight intensity={0.55} />
          <directionalLight position={[1, 1.3, 2]} intensity={0.9} />
          <directionalLight
            position={[-2, -1, -1]}
            intensity={0.35}
            color={0xff8050}
          />
          <Grid
            args={[700, 700]}
            position={[0, 0, -0.1]}
            cellSize={25}
            cellThickness={0.5}
            cellColor="#2c353b"
            sectionSize={100}
            sectionThickness={1}
            sectionColor="#1c2429"
            fadeDistance={800}
            infiniteGrid
          />
          <AutoRotateGroup>
            <SharedReliefMesh
              geometry={geometry}
              colorData={colorData}
              pw={settings.pw}
              ph={settings.ph}
            />
          </AutoRotateGroup>
        </Canvas>

        {/* HUD Overlay - Top Left */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <h1 className="font-heading text-xl text-ink leading-tight">
            {data.projectName}
          </h1>
          <div className="font-mono text-[11px] text-dim mt-1 leading-[1.6]">
            {settings.gc}×{settings.gr} grid · {settings.pw}×{settings.ph}mm tiles
            <br />
            <span className="text-accent2 font-bold">{viewMode}</span>
            {settings.puzzleOn ? ' · snap-lock' : settings.join ? ' · interlocking' : ''}
            {settings.colorOn ? ` · ${settings.nc} colors` : ''}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-heading text-xs text-dim tracking-wide">
              Made with{' '}
              <span className="text-ink">
                RELIEF<span className="text-accent">·</span>FORGE
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-line bg-panel px-4 py-3 flex items-center gap-4 flex-wrap">
        {/* Tile Picker */}
        {isGrid && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-dim uppercase">Tile</span>
            <div className="flex gap-1 flex-wrap">
              {(() => {
                const gc = settings.gc || 1;
                const gr = settings.gr || 1;
                const buttons: { col: number; row: number; idx: number }[] = [];
                // Match editor ordering: rows go top-to-bottom (gr down to 1), cols left-to-right
                let idx = 0;
                for (let r = gr; r >= 1; r--) {
                  for (let c = 1; c <= gc; c++) {
                    buttons.push({ col: c, row: r, idx: idx++ });
                  }
                }
                return buttons.map(({ col, row, idx }) => {
                  const active = col === tileCol && row === tileRow;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleTileChange(col, row)}
                      className={`w-7 h-7 font-mono text-[10px] rounded border transition-colors ${
                        active
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-line bg-panel2 text-dim hover:border-dim'
                      }`}
                    >
                      {col},{row}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Panel/Mold Toggle */}
        <button
          onClick={handleViewToggle}
          className="font-mono text-[11px] text-dim hover:text-ink border border-line px-3 py-1.5 rounded hover:border-dim transition-colors"
        >
          {viewMode === 'PANEL' ? '⬚ Panel' : '⬛ Mold'} → Toggle
        </button>

        {/* CTA */}
        <Link
          href="/signup"
          className="bg-accent text-white font-medium text-xs px-4 py-2 rounded hover:bg-accent/90 transition-colors"
        >
          Create Your Own →
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────
export default function SharePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [data, setData] = useState<ShareData | null>(null);
  const [status, setStatus] = useState<'loading' | 'password' | 'expired' | 'notfound' | 'ready'>('loading');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    async function fetchShare() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();

        if (res.status === 401 && json.passwordRequired) {
          setStatus('password');
          return;
        }
        if (res.status === 410) {
          setStatus('expired');
          return;
        }
        if (res.status === 404) {
          setStatus('notfound');
          return;
        }
        if (!res.ok) {
          setStatus('notfound');
          return;
        }

        setData(json);
        setStatus('ready');
      } catch {
        setStatus('notfound');
      }
    }

    fetchShare();
  }, [token]);

  const handlePasswordSubmit = (shareData: ShareData) => {
    setData(shareData);
    setStatus('ready');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#101417] flex items-center justify-center">
        <span className="font-mono text-dim text-sm animate-pulse">Loading shared relief...</span>
      </div>
    );
  }

  if (status === 'password') {
    return (
      <PasswordForm
        token={token}
        onSubmit={handlePasswordSubmit}
        error={passwordError}
      />
    );
  }

  if (status === 'expired') {
    return <ExpiredView />;
  }

  if (status === 'notfound' || !data) {
    return <NotFoundView />;
  }

  return <SharedViewer data={data} token={token} />;
}
