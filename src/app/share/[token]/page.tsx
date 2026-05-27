export default function SharePage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="font-heading text-3xl text-ink">Shared Relief</h1>
      <p className="mt-2 text-dim">Token: {params.token}</p>
    </main>
  );
}
