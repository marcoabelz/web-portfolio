// Shown while the page reads the content files from GitHub. It mirrors the editor's
// shape (sidebar, then three field blocks) so nothing jumps when the real editor lands.
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the editor" className="flex min-h-dvh flex-col bg-canvas">
      <div className="flex h-16 items-center gap-3 border-b border-line bg-surface px-4">
        <span className="skeleton h-5 w-32 rounded-md" />
        <span className="skeleton ml-auto h-10 w-40 rounded-xl max-sm:hidden" />
        <span className="skeleton size-10 rounded-full" />
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-[260px] shrink-0 space-y-2 border-r border-line bg-surface p-4 min-[960px]:block">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className="skeleton block h-9 rounded-lg" />
          ))}
        </aside>
        <main className="flex-1 space-y-5 p-4 sm:p-8">
          <span className="skeleton block h-8 w-56 rounded-md" />
          <span className="skeleton block h-4 w-80 max-w-full rounded-md" />
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index} className="skeleton block h-36 rounded-card" />
          ))}
        </main>
      </div>
    </div>
  );
}
