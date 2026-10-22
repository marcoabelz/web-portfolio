import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SkeletonImage } from "@/components/ui/SkeletonImage";
import { TechChip } from "@/components/ui/TechChip";
import { ProjectCover } from "@/components/work/ProjectCover";
import type { AppCardModel, AppsModel } from "@/data/home";

type Labels = AppsModel["labels"];

function FeaturedCard({ card, labels }: { card: Extract<AppCardModel, { kind: "featured" }>; labels: Labels }) {
  const { screenshot } = card;

  return (
    <Card as="article" interactive className="app-card app-featured" data-card="featured">
      <div className="app-media">
        <SkeletonImage
          src={screenshot.src}
          width={screenshot.width}
          height={screenshot.height}
          alt={screenshot.alt}
          sizes="(min-width: 1280px) 720px, (min-width: 800px) 55vw, 100vw"
          className="size-full"
        />
      </div>
      <div className="app-body">
        <div className="app-top">
          <span className="app-ctx">{card.contextLabel} · {card.years}</span>
          <a
            className="app-live"
            href={card.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${labels.live}: ${labels.openLive.replace("{projectName}", card.name)} (${labels.newTab})`}
          >
            {labels.live}
          </a>
        </div>
        <h3 className="app-name">{card.name}</h3>
        <p className="app-outcome">{card.outcome}</p>
        <ul aria-label={labels.technologyStack} className="m-0 flex list-none flex-wrap gap-2 p-0">
          {card.stack.map((tag) => (
            <li key={tag.name}>
              <TechChip tag={tag} size="sm" />
            </li>
          ))}
        </ul>
        <Link href={card.href} className="app-go">
          {labels.viewCaseStudy}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </Link>
      </div>
    </Card>
  );
}

function PrivateCard({ card, labels }: { card: Extract<AppCardModel, { kind: "private" }>; labels: Labels }) {
  return (
    <Card as="article" interactive className="app-card" data-card="private">
      <div className="app-media">
        <ProjectCover
          cover={
            card.screenshot
              ? { kind: "image", ...card.screenshot }
              : { kind: "abstract", variant: card.cover.variant, alt: card.cover.alt }
          }
          label={card.confidential ? labels.privateSystem : undefined}
          sizes="(min-width: 1800px) 880px, (min-width: 800px) 46vw, 100vw"
        />
      </div>
      <div className="app-body">
        <div className="app-top">
          <h3 className="app-name">
            <Link href={card.href} className="app-go-link">
              {card.name}
              <span className="sr-only"> ({card.contextLabel})</span>
            </Link>
          </h3>
          <span className="app-ctx">{card.years}</span>
        </div>
        {/* The visible lock chip sits inside the role="img" cover, where assistive tech
            ignores children, so the card says it once here. */}
        {card.confidential ? <p className="sr-only">{labels.privateSystem}</p> : null}
        <p className="app-outcome">{card.outcome}</p>
      </div>
    </Card>
  );
}

export function SelectedApps({ model, number }: { model: AppsModel; number: string }) {
  return (
    <section id="apps" className="section-space editorial-rule" aria-labelledby="apps-heading">
      <Container>
        <SectionHeader
          id="apps-heading"
          number={number}
          title={model.title}
          description={model.description}
        />

        <div className="apps-grid">
          {model.cards.map((card) =>
            card.kind === "featured" ? (
              <FeaturedCard key={card.slug} card={card} labels={model.labels} />
            ) : (
              <PrivateCard key={card.slug} card={card} labels={model.labels} />
            ),
          )}
        </div>

        <div className="apps-foot">
          <span>{model.privateNote}</span>
          <Link href={model.earlierHref} className="apps-earlier">
            {model.earlierLabel}
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
