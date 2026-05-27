'use client';

import { useEffect, useState, useCallback } from 'react';

interface ShareLink {
  id: string;
  token: string;
  url: string;
  passwordProtected: boolean;
  expiresAt: string | null;
  expired: boolean;
  views: number;
  createdAt: string;
}

interface ShareListProps {
  projectId: string;
}

export default function ShareList({ projectId }: ShareListProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/share/list?projectId=${encodeURIComponent(projectId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCopy = useCallback(async (link: ShareLink) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${link.url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleDelete = useCallback(
    async (token: string) => {
      try {
        const res = await fetch(`/api/share/${token}`, { method: 'DELETE' });
        if (res.ok) {
          setLinks((prev) => prev.filter((l) => l.token !== token));
        }
      } catch {
        // silent
      }
    },
    []
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="font-mono text-xs text-dim py-4">Loading share links...</div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="font-mono text-xs text-dim py-4 text-center border border-dashed border-line rounded p-4">
        No share links yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div
          key={link.id}
          className={`bg-panel2 border rounded p-3 flex items-center gap-3 ${
            link.expired ? 'border-red-800/50 opacity-70' : 'border-line'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs text-ink truncate">
              {link.token.slice(0, 12)}...
              {link.passwordProtected && (
                <span className="ml-1 text-accent">🔒</span>
              )}
              {link.expired && (
                <span className="ml-1 text-red-400">(expired)</span>
              )}
            </div>
            <div className="font-mono text-[10px] text-dim mt-0.5">
              {link.views} views · Created {formatDate(link.createdAt)}
              {link.expiresAt && (
                <> · Expires {formatDate(link.expiresAt)}</>
              )}
              {!link.expiresAt && <> · No expiry</>}
            </div>
          </div>

          <button
            onClick={() => handleCopy(link)}
            className={`font-mono text-[10px] px-2 py-1 rounded border transition-colors ${
              copiedId === link.id
                ? 'border-accent2 text-accent2'
                : 'border-line text-dim hover:text-ink hover:border-dim'
            }`}
          >
            {copiedId === link.id ? '✓' : 'Copy'}
          </button>

          <button
            onClick={() => handleDelete(link.token)}
            className="font-mono text-[10px] px-2 py-1 rounded border border-line text-dim hover:text-red-400 hover:border-red-800 transition-colors"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
