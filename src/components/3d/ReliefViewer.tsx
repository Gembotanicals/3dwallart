'use client';

import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/store';
import {
  buildGeometry,
  buildHeightGrid,
  buildMoldGeometry,
  colorAttr,
  GeometryResult,
} from '@/lib/relief-engine';

export type PreviewMode = 'tile' | 'all';

function meshGeometryFromResult(
  geometry: GeometryResult,
  colorData: Float32Array | null,
  offsetX: number,
  offsetY: number,
  tileWidth: number,
  tileHeight: number
) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(geometry.array.slice(), 3));
  if (colorData) {
    g.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
  }
  g.computeVertexNormals();
  g.translate(offsetX - tileWidth / 2, offsetY - tileHeight / 2, 0);
  return g;
}

function ReliefMesh() {
  const geometry = useEditorStore((s) => s.geometry);
  const colorData = useEditorStore((s) => s.colorData);
  const settings = useEditorStore((s) => s.settings);
  const meshRef = useRef<THREE.Mesh>(null);

  const bufferGeometry = useMemo(() => {
    if (!geometry) return null;
    return meshGeometryFromResult(geometry, colorData, 0, 0, settings.pw, settings.ph);
  }, [geometry, colorData, settings.pw, settings.ph]);

  // Dispose old geometry when it changes or component unmounts
  useEffect(() => {
    return () => {
      bufferGeometry?.dispose();
    };
  }, [bufferGeometry]);

  if (!bufferGeometry) return null;

  return (
    <mesh ref={meshRef} geometry={bufferGeometry}>
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

function AllTilesMesh() {
  const img = useEditorStore((s) => s.img);
  const settings = useEditorStore((s) => s.settings);
  const colors = useEditorStore((s) => s.colors);
  const bands = useEditorStore((s) => s.bands);

  const tiles = useMemo(() => {
    if (!img || typeof document === 'undefined') return [];

    const tileCount = settings.gc * settings.gr;
    const previewRes = Math.min(
      settings.res,
      tileCount > 24 ? 58 : tileCount > 12 ? 72 : tileCount > 6 ? 96 : 120
    );
    const gap = Math.max(8, Math.min(18, Math.min(settings.pw, settings.ph) * 0.08));
    const stepX = settings.pw + gap;
    const stepY = settings.ph + gap;
    const originX = -((settings.gc - 1) * stepX) / 2;
    const originY = -((settings.gr - 1) * stepY) / 2;
    const scratchCanvas = document.createElement('canvas');
    const nextTiles: { id: string; geometry: THREE.BufferGeometry; colorData: Float32Array | null }[] = [];

    for (let row = 1; row <= settings.gr; row++) {
      for (let col = 1; col <= settings.gc; col++) {
        const localSettings = { ...settings, tcol: col, trow: row, res: previewRes };
        const hg = buildHeightGrid(img, scratchCanvas, localSettings);
        if (!hg) continue;
        const geo = localSettings.out === 'MOLD'
          ? buildMoldGeometry(hg, localSettings)
          : buildGeometry(hg, localSettings);
        if (!geo) continue;
        const tileColorData = localSettings.out === 'PANEL' && localSettings.colorOn
          ? colorAttr(geo, colors, bands, localSettings.base, localSettings.relief)
          : null;
        nextTiles.push({
          id: `${col}-${row}`,
          geometry: meshGeometryFromResult(
            geo,
            tileColorData,
            originX + (col - 1) * stepX,
            originY + (row - 1) * stepY,
            localSettings.pw,
            localSettings.ph
          ),
          colorData: tileColorData,
        });
      }
    }

    return nextTiles;
  }, [img, settings, colors, bands]);

  useEffect(() => {
    return () => {
      tiles.forEach((tile) => tile.geometry.dispose());
    };
  }, [tiles]);

  return (
    <>
      {tiles.map((tile) => (
        <mesh key={tile.id} geometry={tile.geometry}>
          <meshStandardMaterial
            color={tile.colorData ? 0xffffff : 0xd8dde0}
            vertexColors={!!tile.colorData}
            roughness={0.72}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

function sceneSpan(previewMode: PreviewMode) {
  const settings = useEditorStore.getState().settings;
  if (previewMode === 'all') {
    const gap = Math.max(8, Math.min(18, Math.min(settings.pw, settings.ph) * 0.08));
    const connectorPad = settings.puzzleOn ? settings.puzzleExtent * 2 : settings.join ? settings.to : 0;
    return {
      width: settings.gc * settings.pw + Math.max(0, settings.gc - 1) * gap + connectorPad,
      height: settings.gr * settings.ph + Math.max(0, settings.gr - 1) * gap + connectorPad,
      depth: settings.base + settings.relief,
    };
  }

  return {
    width: settings.pw + (settings.puzzleOn ? settings.puzzleExtent * 2 : settings.join ? settings.to : 0),
    height: settings.ph + (settings.puzzleOn ? settings.puzzleExtent * 2 : settings.join ? settings.to : 0),
    depth: settings.base + settings.relief,
  };
}

function AutoRotate({ previewMode }: { previewMode: PreviewMode }) {
  const controlsRef = useRef<any>(null);
  const [spinning, setSpinning] = useState(true);
  const resetView = useEditorStore((s) => s.resetView);
  const setResetView = useEditorStore((s) => s.setResetView);
  const settings = useEditorStore((s) => s.settings);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const frameView = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const span = sceneSpan(previewMode);
    const radius = Math.max(120, Math.hypot(span.width, span.height, span.depth) * 0.62);
    camera.position.set(radius * 0.72, -radius * 0.92, radius * 0.62);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = 0;
    }
  }, [camera, previewMode]);

  useFrame(() => {
    if (spinning && groupRef.current) {
      groupRef.current.rotation.z += 0.004;
    }
  });

  useEffect(() => {
    setSpinning(true);
    frameView();
  }, [
    frameView,
    settings.gc,
    settings.gr,
    settings.pw,
    settings.ph,
    settings.puzzleExtent,
    settings.join,
    settings.puzzleOn,
  ]);

  useEffect(() => {
    if (resetView) {
      setSpinning(true);
      frameView();
      setResetView(false);
    }
  }, [frameView, resetView, setResetView]);

  return (
    <group ref={groupRef}>
      {previewMode === 'all' ? <AllTilesMesh /> : <ReliefMesh />}
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

export default function ReliefViewer({ previewMode = 'tile' }: { previewMode?: PreviewMode }) {
  return (
    <div className="flex-1 min-h-0 relative" id="relief-viewport">
      <Canvas
        gl={{ antialias: true }}
        dpr={[1, 2]}
        style={{ background: '#0c1013' }}
      >
        <CameraSetup />
        <ambientLight intensity={0.55} />
        <directionalLight position={[1, 1.3, 2]} intensity={0.9} />
        <directionalLight position={[-2, -1, -1]} intensity={0.35} color={0xff8050} />
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
        <AutoRotate previewMode={previewMode} />
      </Canvas>
    </div>
  );
}
