import { Container } from "@/components/ui/Container";

// Same grid as the archive: a title bar, then cards with an image block and text lines.
// It carries no copy, so one file serves both locales.
export default function ArchiveLoading() {
  return (
    <div aria-busy="true" className="pb-20 pt-8 sm:pb-24 sm:pt-10 lg:pb-32 lg:pt-14">
      <Container>
        <div className="skeleton h-11 w-40 rounded-card" />
        <div className="mt-10 sm:mt-14 lg:mt-20">
          <div className="skeleton h-4 w-32 rounded-full" />
          <div className="skeleton mt-4 h-14 w-2/3 rounded-card sm:h-20" />
        </div>
        <div className="mt-12 grid min-w-0 gap-3 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="card p-3 pb-6">
              <div className="skeleton aspect-[16/10] w-full rounded-[14px]" />
              <div className="mt-4 space-y-3 px-2.5">
                <div className="skeleton h-3 w-24 rounded-full" />
                <div className="skeleton h-6 w-2/3 rounded-full" />
                <div className="skeleton h-4 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
