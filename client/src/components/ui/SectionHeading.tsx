type SectionHeadingProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="">
      <p className="eyebrow">{eyebrow}</p>
      <h2
        id={id}
        className="text-balance mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-5xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
