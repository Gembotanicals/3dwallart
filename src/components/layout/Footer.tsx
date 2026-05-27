export function Footer() {
  return (
    <footer className="border-t border-line bg-panel py-4">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-dim">
        &copy; {new Date().getFullYear()} ReliefForge. All rights reserved.
      </div>
    </footer>
  );
}
