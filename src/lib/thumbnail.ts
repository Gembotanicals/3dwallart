'use client';

// Capture thumbnail from 3D viewport and save to project
export async function captureThumbnail(projectId: string): Promise<void> {
  try {
    const viewport = document.getElementById('relief-viewport');
    const canvas = viewport?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    if (!dataUrl || dataUrl === 'data:,') return;

    await fetch(`/api/projects/${projectId}/thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: dataUrl }),
    });
  } catch (e) {
    // silent fail for thumbnail save
    console.error('Failed to capture thumbnail:', e);
  }
}
