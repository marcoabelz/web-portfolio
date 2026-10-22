"use client";

import { useState } from "react";

import { TechChip } from "@/components/ui/TechChip";
import type { ExperienceModel, ExperienceRowModel } from "@/data/home";

// The only client island of the section: it gets plain data, never the icon lookup.
export function ExperienceRow({
  row,
  labels,
}: {
  row: ExperienceRowModel;
  labels: ExperienceModel["labels"];
}) {
  const [open, setOpen] = useState(false);
  const buttonId = `experience-${row.id}-button`;
  const panelId = `experience-${row.id}-details`;

  return (
    <li className="exp-row" data-open={open}>
      <h3 className="exp-heading">
        <button
          type="button"
          id={buttonId}
          className="exp-button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="exp-when">{row.period}</span>
          <span className="exp-main">
            <span className="exp-company">{row.company}</span>
            <span className="exp-role">{row.role}</span>
          </span>
          <span className="exp-summary">{row.summary}</span>
          <span className="exp-where">
            <span>{row.place}</span>
            <svg className="exp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="m6 9 6 6 6-6" />
            </svg>
            <span className="sr-only">{open ? labels.hide : labels.show}</span>
          </span>
        </button>
      </h3>

      <div id={panelId} className="exp-panel" data-open={open}>
        <div className="exp-panel-clip">
          <div className="exp-details">
            <div className="exp-group exp-group-highlights">
              <p id={`experience-${row.id}-highlights-label`} className="exp-group-label">
                {labels.highlights}
              </p>
              <ul className="exp-highlights" aria-labelledby={`experience-${row.id}-highlights-label`}>
                {row.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
            <div className="exp-group exp-group-stack">
              <p className="exp-group-label" aria-hidden="true">
                {labels.stack}
              </p>
              <ul className="exp-stack" aria-label={row.stackLabel}>
                {row.stack.map((tag) => (
                  <li key={tag.name}>
                    <TechChip tag={tag} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
