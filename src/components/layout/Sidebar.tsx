export function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-line bg-panel p-4">
      <nav className="flex flex-col gap-2 text-sm text-dim">
        <a href="/dashboard" className="hover:text-ink transition-colors">
          Dashboard
        </a>
        <a href="/library" className="hover:text-ink transition-colors">
          Library
        </a>
        <a href="/settings" className="hover:text-ink transition-colors">
          Settings
        </a>
      </nav>
    </aside>
  );
}
