import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {/* Decorative geometric element */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Large outer square rotated */}
          <div className="absolute inset-0 border-2 border-line rotate-45 rounded-lg" />
          {/* Medium inner square */}
          <div className="absolute inset-6 border border-accent/30 rotate-12 rounded" />
          {/* Small center square */}
          <div className="absolute inset-12 bg-accent/10 border border-accent/50 rounded-sm" />
          {/* Cross lines */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-line" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-line" />
          {/* Center number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-heading text-4xl text-accent/60">404</span>
          </div>
        </div>

        <h1 className="font-heading text-3xl text-ink mb-3">
          Page not found
        </h1>
        <p className="font-sans text-dim mb-8 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
          Head back to your dashboard to continue working on your projects.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="bg-accent hover:bg-accent/90 text-white font-sans font-medium text-sm px-6 py-2.5 rounded transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="border border-line hover:border-accent/50 text-ink font-sans font-medium text-sm px-6 py-2.5 rounded transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
