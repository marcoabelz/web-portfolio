import { Container } from "@/components/ui/Container";

// Shaped like the case study (back link, meta row, title, hero image, text lines) with
// the same paddings, so the page that replaces it does not shift. It carries no copy,
// so one file serves both locales.
export default function CaseStudyLoading() {
  return (
    <div aria-busy="true" className="pb-20 pt-8 sm:pb-24 sm:pt-10 lg:pb-32 lg:pt-14">
      <Container>
        <div className="skeleton h-11 w-40 rounded-card" />
        <div className="mt-10 sm:mt-14 lg:mt-20">
          <div className="skeleton h-4 w-56 max-w-full rounded-full" />
          <div className="skeleton mt-6 h-14 w-3/4 rounded-card sm:h-20" />
          <div className="skeleton mt-4 h-6 w-1/2 rounded-full" />
        </div>
        <div className="skeleton mt-12 aspect-[16/10] w-full rounded-card" />
        <div className="mt-12 space-y-4">
          <div className="skeleton h-4 w-full max-w-3xl rounded-full" />
          <div className="skeleton h-4 w-full max-w-3xl rounded-full" />
          <div className="skeleton h-4 w-2/3 max-w-3xl rounded-full" />
        </div>
      </Container>
    </div>
  );
}
