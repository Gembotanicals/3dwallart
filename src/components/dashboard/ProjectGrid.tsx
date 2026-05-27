'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  version: number;
  updatedAt: string;
  createdAt: string;
  exportCount: number;
}

interface ProjectGridProps {
  projects: Project[];
  loading: boolean;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-line bg-panel overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-panel2" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-panel2 rounded w-3/4" />
        <div className="h-3 bg-panel2 rounded w-1/2" />
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onDelete,
  onDuplicate,
}: {
  project: Project;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    try {
      await onDuplicate(project.id);
    } catch (e) {
      // handled by parent
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(project.id);
      setShowConfirmDelete(false);
    } catch (e) {
      // handled by parent
    }
  };

  return (
    <div className="group relative rounded-lg border border-line bg-panel overflow-hidden hover:border-accent/50 transition-colors">
      {/* Thumbnail */}
      <Link href={`/editor/${project.id}`} className="block">
        <div className="aspect-[4/3] relative overflow-hidden">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-panel2 via-bg to-panel2 flex items-center justify-center">
              <span className="font-mono text-dim text-xs">No preview</span>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <span className="bg-accent text-white text-xs font-bold px-3 py-1.5 rounded">
              Open
            </span>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-sans text-sm text-ink truncate font-medium">
            {project.name}
          </h3>
          <span className="shrink-0 font-mono text-[10px] text-dim bg-panel2 px-1.5 py-0.5 rounded">
            v{project.version}
          </span>
        </div>
        <p className="font-mono text-[11px] text-dim mt-1">
          {formatDate(project.updatedAt)}
          {project.exportCount > 0 && ` · ${project.exportCount} exports`}
        </p>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDuplicate}
          className="bg-panel/90 hover:bg-panel2 border border-line text-dim hover:text-ink p-1.5 rounded text-xs"
          title="Duplicate"
        >
          ⧉
        </button>
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="bg-panel/90 hover:bg-red-900/50 border border-line text-dim hover:text-red-400 p-1.5 rounded text-xs"
          title="Delete"
        >
          ✕
        </button>
      </div>

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="text-center p-3">
            <p className="text-sm text-ink mb-3">Delete this project?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded"
              >
                Delete
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-panel border border-line text-dim text-xs px-3 py-1.5 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectGrid({ projects, loading, onDelete, onDuplicate }: ProjectGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-panel2 flex items-center justify-center mb-4">
          <span className="text-2xl">📐</span>
        </div>
        <h3 className="font-heading text-lg text-ink mb-1">No projects yet</h3>
        <p className="font-mono text-sm text-dim">Create your first relief.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}
