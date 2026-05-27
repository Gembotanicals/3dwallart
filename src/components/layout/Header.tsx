export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <a href="/" className="font-heading text-lg text-accent">
          ReliefForge
        </a>
        <nav className="flex items-center gap-4 text-sm text-dim">
          <a href="/dashboard" className="hover:text-ink transition-colors">
            Dashboard
          </a>
          <a href="/library" className="hover:text-ink transition-colors">
            Library
          </a>
        </nav>
      </div>
    </header>
  );
}
