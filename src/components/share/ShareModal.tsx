'use client';

import { useState, useCallback } from 'react';

interface ShareModalProps {
  projectId: string;
  onClose: () => void;
}

export default function ShareModal({ projectId, onClose }: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState<number>(7);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const body: any = {
        projectId,
        expiresIn: expiry,
      };

      if (passwordEnabled && password.trim()) {
        body.password = password.trim();
      }

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create share link');
        return;
      }

      setGeneratedLink(data.url);
      setFullUrl(data.fullUrl);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [projectId, expiry, passwordEnabled, password]);

  const handleCopy = useCallback(async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [fullUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-panel border border-line rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-heading text-lg text-ink">Share Project</h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-ink transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Generated link display */}
          {generatedLink ? (
            <div className="space-y-3">
              <div className="bg-panel2 border border-line rounded p-3 flex items-center gap-2">
                <span className="font-mono text-sm text-accent2 flex-1 truncate">
                  {fullUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className={`font-mono text-xs px-3 py-1.5 rounded border transition-colors ${
                    copied
                      ? 'border-accent2 text-accent2 bg-accent2/10'
                      : 'border-line text-dim hover:text-ink hover:border-dim'
                  }`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* QR placeholder */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-panel2 border border-line rounded flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-[2px] w-10 h-10">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${
                          Math.random() > 0.4 ? 'bg-ink' : 'bg-panel2'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="font-mono text-[10px] text-dim leading-[1.5]">
                  QR CODE
                  <br />
                  scan to open
                </div>
              </div>

              <button
                onClick={() => {
                  setGeneratedLink(null);
                  setFullUrl(null);
                }}
                className="font-mono text-xs text-dim hover:text-ink transition-colors"
              >
                ← Generate another link
              </button>
            </div>
          ) : (
            <>
              {/* Options */}
              <div className="space-y-4">
                {/* Expiry selector */}
                <div>
                  <label className="font-mono text-[11px] text-dim uppercase block mb-2">
                    Link Expiry
                  </label>
                  <div className="flex gap-2">
                    {[
                      { label: '7 days', value: 7 },
                      { label: '30 days', value: 30 },
                      { label: 'Never', value: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setExpiry(opt.value)}
                        className={`font-mono text-xs px-3 py-2 rounded border transition-colors flex-1 ${
                          expiry === opt.value
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-line bg-panel2 text-dim hover:border-dim'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Password protection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-mono text-[11px] text-dim uppercase">
                      Password Protection
                    </label>
                    <button
                      onClick={() => setPasswordEnabled(!passwordEnabled)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        passwordEnabled ? 'bg-accent' : 'bg-panel2 border border-line'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          passwordEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {passwordEnabled && (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-panel2 border border-line text-ink px-3 py-2 rounded font-mono text-sm focus:outline-none focus:border-accent"
                    />
                  )}
                  <p className="font-mono text-[10px] text-dim mt-1">
                    {passwordEnabled
                      ? 'Requires Team plan or higher'
                      : 'Toggle to add password protection'}
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-300 text-sm px-3 py-2 rounded">
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading || (passwordEnabled && !password.trim())}
                className="w-full bg-accent text-white py-3 rounded font-medium text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Share Link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
