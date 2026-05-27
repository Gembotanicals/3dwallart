'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/lib/store';

function ReliefMesh() {
  const geometry = useEditorStore((s) => s.geometry);
  const colorData = useEditorStore((s) => s.colorData);
  const settings = useEditorStore((s) => s.settings);
  const meshRef = useRef<THREE.Mesh>(null);

  const bufferGeometry = useMemo(() => {
    if (!geometry) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(geometry.array, 3));
    if (colorData) {
      g.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
    }
    g.computeVertexNormals();
    g.translate(-settings.pw / 2, -settings.ph / 2, 0);
    return g;
  }, [geometry, colorData, settings.pw, settings.ph]);

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

function AutoRotate() {
  const controlsRef = useRef<any>(null);
  const [spinning, setSpinning] = useState(true);
  const resetView = useEditorStore((s) => s.resetView);
  const setResetView = useEditorStore((s) => s.setResetView);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (spinning && groupRef.current) {
      groupRef.current.rotation.z += 0.004;
    }
  });

  useEffect(() => {
    if (resetView) {
      setSpinning(true);
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
      if (groupRef.current) {
        groupRef.current.rotation.z = 0;
      }
      setResetView(false);
    }
  }, [resetView, setResetView]);

  return (
    <group ref={groupRef}>
      <ReliefMesh />
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

export default function ReliefViewer() {
  return (
    <div className="flex-1 min-h-0 relative">
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
        <AutoRotate />
      </Canvas>
    </div>
  );
}
