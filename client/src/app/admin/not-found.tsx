// Without this the unconfigured editor renders Next's default 404 inside the root
// layout, which is a passthrough with no <html> — a blank white page instead of a 404.
export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">404</h1>
      <p className="text-sm text-muted">This page could not be found.</p>
    </main>
  );
}
