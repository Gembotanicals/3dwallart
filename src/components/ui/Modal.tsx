export function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-lg border border-line bg-panel p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
