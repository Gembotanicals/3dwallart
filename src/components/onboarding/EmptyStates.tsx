'use client';

import { useRouter } from 'next/navigation';

export function DashboardEmpty() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* CSS geometric illustration */}
      <div className="relative w-24 h-24 mb-6">
        {/* Outer diamond */}
        <div className="absolute inset-0 border-2 border-accent/30 rounded-lg rotate-45" />
        {/* Inner square */}
        <div className="absolute inset-4 bg-accent/10 border border-accent/50 rounded" />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-accent rounded-full" />
        </div>
        {/* Decorative lines */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-accent/20" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-accent/20" />
      </div>

      <h3 className="font-heading text-xl text-ink mb-2">
        No projects yet
      </h3>
      <p className="font-sans text-dim mb-6 max-w-sm">
        Create your first relief panel. Upload an image, adjust the depth
        settings, and export a 3D printable STL.
      </p>
      <button
        onClick={() => {
          // Trigger the create modal in the parent
          const event = new CustomEvent('open-create-modal');
          window.dispatchEvent(event);
        }}
        className="bg-accent hover:bg-accent/90 text-white font-sans font-medium text-sm px-6 py-2.5 rounded transition-colors"
      >
        + Create First Project
      </button>
    </div>
  );
}

export function LibraryEmpty() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* CSS geometric illustration - image frame */}
      <div className="relative w-24 h-24 mb-6">
        {/* Frame */}
        <div className="absolute inset-0 border-2 border-accent2/30 rounded-lg" />
        {/* Mountain shapes */}
        <div
          className="absolute bottom-4 left-4 w-0 h-0"
          style={{
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderBottom: '18px solid rgba(54, 224, 192, 0.3)',
          }}
        />
        <div
          className="absolute bottom-4 left-10 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '12px solid rgba(54, 224, 192, 0.5)',
          }}
        />
        {/* Sun */}
        <div className="absolute top-4 right-5 w-4 h-4 bg-accent2/40 rounded-full" />
        {/* Upload arrow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-accent2 text-2xl">↑</span>
        </div>
      </div>

      <h3 className="font-heading text-xl text-ink mb-2">
        No images uploaded
      </h3>
      <p className="font-sans text-dim mb-6 max-w-sm">
        Upload photos or graphics to use as source material for your relief
        panels. Drag and drop, or browse your files.
      </p>
      <button
        onClick={() => {
          const event = new CustomEvent('open-upload');
          window.dispatchEvent(event);
        }}
        className="bg-accent2 hover:bg-accent2/90 text-bg font-sans font-medium text-sm px-6 py-2.5 rounded transition-colors"
      >
        ↑ Upload Images
      </button>
    </div>
  );
}
