'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatBytes } from '@/lib/utils';

interface ExportRecord {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  format: string;
  resolution: number;
  url: string | null;
  fileSize: number | null;
  errorMsg: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function ExportHistory({ projectId }: { projectId: string }) {
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const fetchExports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?projectId=${projectId}`);
      const data = await res.json();
      if (data.exports) {
        setExports(data.exports);
      }
    } catch (err) {
      console.error('Failed to fetch exports:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  // Auto-refresh while any job is processing
  useEffect(() => {
    const hasActive = exports.some(
      (e) => e.status === 'PENDING' || e.status === 'PROCESSING'
    );
    if (!hasActive) return;

    const interval = setInterval(fetchExports, 3000);
    return () => clearInterval(interval);
  }, [exports, fetchExports]);

  const deleteExport = async (id: string) => {
    try {
      await fetch(`/api/export/${id}`, { method: 'DELETE' });
      setExports((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete export:', err);
    }
  };

  const totalPages = Math.max(1, Math.ceil(exports.length / pageSize));

  // Clamp page to valid range when data changes (exports added/removed)
  const prevLenRef = useRef(exports.length);
  useEffect(() => {
    if (exports.length !== prevLenRef.current) {
      prevLenRef.current = exports.length;
      const maxPage = Math.max(0, totalPages - 1);
      if (page > maxPage) setPage(maxPage);
    }
  }, [exports.length, totalPages, page]);

  const paginatedExports = exports.slice(page * pageSize, (page + 1) * pageSize);

  if (exports.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="font-mono text-[10px] text-dim uppercase mb-2 flex items-center justify-between">
        <span>Export History</span>
        {loading && <span className="text-accent">refreshing...</span>}
      </div>

      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-dim border-b border-line">
            <th className="text-left py-1 px-1 font-normal">Format</th>
            <th className="text-left py-1 px-1 font-normal">Res</th>
            <th className="text-left py-1 px-1 font-normal">Status</th>
            <th className="text-left py-1 px-1 font-normal">Size</th>
            <th className="text-left py-1 px-1 font-normal">Date</th>
            <th className="text-right py-1 px-1 font-normal">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedExports.map((exp) => (
            <tr key={exp.id} className="border-b border-line/50 hover:bg-panel2/50">
              <td className="py-1.5 px-1 text-ink">{formatLabel(exp.format)}</td>
              <td className="py-1.5 px-1 text-dim">{exp.resolution}px</td>
              <td className="py-1.5 px-1">
                <StatusBadge status={exp.status} />
              </td>
              <td className="py-1.5 px-1 text-dim">
                {exp.fileSize ? formatBytes(exp.fileSize) : '—'}
              </td>
              <td className="py-1.5 px-1 text-dim">
                {new Date(exp.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="py-1.5 px-1 text-right">
                <div className="flex gap-1 justify-end">
                  {exp.status === 'COMPLETED' && exp.url && (
                    <a
                      href={exp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent2 underline"
                    >
                      DL
                    </a>
                  )}
                  <button
                    onClick={() => deleteExport(exp.id)}
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="font-mono text-[10px] text-dim hover:text-ink disabled:opacity-30"
          >
            ← prev
          </button>
          <span className="font-mono text-[10px] text-dim">
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="font-mono text-[10px] text-dim hover:text-ink disabled:opacity-30"
          >
            next →
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
    PROCESSING: 'bg-blue-900/40 text-blue-400 border-blue-700/50',
    COMPLETED: 'bg-green-900/40 text-green-400 border-green-700/50',
    FAILED: 'bg-red-900/40 text-red-400 border-red-700/50',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm border ${
        styles[status] || 'bg-panel2 text-dim border-line'
      }`}
    >
      {status === 'PROCESSING' && (
        <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status}
    </span>
  );
}

function formatLabel(format: string): string {
  switch (format) {
    case 'THREE_MF':
      return '3MF';
    default:
      return format;
  }
}


