export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded border border-line bg-panel px-4 py-3 text-sm text-ink shadow-lg">
      {message}
    </div>
  );
}
