export default function EditorPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="font-heading text-3xl text-ink">Editor</h1>
      <p className="mt-2 text-dim">Project: {params.id}</p>
    </main>
  );
}
