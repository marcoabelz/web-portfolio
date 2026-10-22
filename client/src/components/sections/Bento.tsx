import { SkeletonImage } from "@/components/ui/SkeletonImage";
import { TechChip } from "@/components/ui/TechChip";
import type { BentoModel } from "@/data/home";

export function Bento({ model }: { model: BentoModel }) {
  const { portrait, caption, facts, dailyStack } = model;

  return (
    <div className="bento-wrap">
      <div className="bento">
        <figure className="card bento-photo">
          <SkeletonImage
            src={portrait.src}
            width={portrait.width}
            height={portrait.height}
            alt={portrait.alt}
            sizes="(min-width: 960px) 30vw, 100vw"
            priority
            className="bento-photo-media"
          />
          <figcaption className="bento-caption">
            <b>{caption.name}</b>
            <span>{caption.title}</span>
            <span>{caption.specialty}</span>
          </figcaption>
        </figure>

        <div className="card bento-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="bento-fact" data-fact>
              <span className="bento-label">{fact.label}</span>
              <div className="bento-num">{fact.value}</div>
              <p>{fact.caption}</p>
            </div>
          ))}
        </div>

        <div className="card bento-stack">
          <span className="bento-label">{dailyStack.label}</span>
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {dailyStack.tags.map((tag) => (
              <li key={tag.name}>
                <TechChip tag={tag} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
