'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Decorative element */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-2 border-red-500/30 rounded-lg rotate-12" />
          <div className="absolute inset-2 border border-red-500/20 rounded-lg -rotate-6" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">⚠</span>
          </div>
        </div>

        <h1 className="font-heading text-2xl text-ink mb-3">
          Something went wrong
        </h1>
        <p className="font-sans text-dim mb-6">
          An unexpected error occurred. Please try again or return to the
          dashboard.
        </p>

        {/* Error details (dev mode) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 text-left bg-panel border border-line rounded-lg p-4 overflow-auto max-h-48">
            <p className="font-mono text-xs text-red-400 mb-2">
              {error.message}
            </p>
            {error.stack && (
              <pre className="font-mono text-[10px] text-dim whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="bg-accent hover:bg-accent/90 text-white font-sans font-medium text-sm px-6 py-2.5 rounded transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="border border-line hover:border-accent/50 text-ink font-sans font-medium text-sm px-6 py-2.5 rounded transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
