'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ProjectGrid from '@/components/dashboard/ProjectGrid';
import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import UpgradePrompt from '@/components/dashboard/UpgradePrompt';

interface Project {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  version: number;
  updatedAt: string;
  createdAt: string;
  exportCount: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('updatedAt');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        sort,
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/projects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, sort]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTotal((prev) => prev - 1);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      if (res.status === 403) {
        setShowUpgrade(true);
        return;
      }
      if (res.ok) {
        fetchProjects();
      }
    } catch (e) {
      console.error('Failed to duplicate:', e);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-b border-line px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-heading text-xl tracking-[-0.5px] uppercase text-ink hover:text-accent transition-colors">
            RELIEF<span className="text-accent">·</span>FORGE
          </Link>
          <span className="font-mono text-[11px] text-dim border border-line py-[3px] px-2 rounded-sm hidden sm:inline">
            DASHBOARD
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/library" className="font-mono text-xs text-dim hover:text-ink transition-colors">
            Library
          </Link>
          <Link href="/settings" className="font-mono text-xs text-dim hover:text-ink transition-colors">
            Settings
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title + Create button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl text-ink">My Projects</h1>
            <p className="font-mono text-xs text-dim mt-1">
              {total} project{total !== 1 ? 's' : ''}
              {session?.user?.plan === 'FREE' && ' · Free plan (3 max)'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-accent hover:bg-accent/90 text-white font-sans font-medium text-sm px-4 py-2 rounded transition-colors shrink-0"
          >
            + New Project
          </button>
        </div>

        {/* Search + Sort controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded border border-line bg-panel px-3 py-2 text-sm text-ink placeholder-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 font-mono"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="rounded border border-line bg-panel px-3 py-2 text-sm text-ink font-mono focus:border-accent focus:outline-none"
          >
            <option value="updatedAt">Recently Modified</option>
            <option value="createdAt">Newest First</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {/* Project Grid */}
        <ProjectGrid
          projects={projects}
          loading={loading}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="font-mono text-xs px-3 py-1.5 rounded border border-line text-dim hover:text-ink hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="font-mono text-xs text-dim">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="font-mono text-xs px-3 py-1.5 rounded border border-line text-dim hover:text-ink hover:border-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLimitReached={() => setShowUpgrade(true)}
      />
      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </main>
  );
}
