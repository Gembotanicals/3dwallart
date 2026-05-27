export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl text-accent">ReliefForge</h1>
          <p className="mt-1 text-sm text-dim">
            Image to Relief to 3D Printable Wall Panels
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-lg border border-line bg-panel p-8 shadow-xl">
          {children}
        </div>
      </div>
    </main>
  );
}
