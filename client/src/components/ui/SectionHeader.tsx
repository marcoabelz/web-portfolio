type SectionHeaderProps = {
  id: string;
  number: string;
  title: string;
  description?: string;
};

export function SectionHeader({ id, number, title, description }: SectionHeaderProps) {
  return (
    <header className="section-header">
      <p className="section-header-no">({number})</p>
      <h2 id={id} className="section-header-title">
        {title}
      </h2>
      {description ? <p className="section-header-desc">{description}</p> : null}
    </header>
  );
}
