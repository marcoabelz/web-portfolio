import type { AnchorHTMLAttributes } from "react";

type ExternalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target" | "rel"
> & {
  readonly href: NonNullable<AnchorHTMLAttributes<HTMLAnchorElement>["href"]>;
  readonly newTabLabel?: string;
};

export function ExternalLink({
  "aria-label": ariaLabel,
  children,
  newTabLabel,
  ...props
}: ExternalLinkProps) {
  const accessibleLabel = ariaLabel && newTabLabel
    ? `${ariaLabel} (${newTabLabel})`
    : ariaLabel;

  return (
    <a
      {...props}
      aria-label={accessibleLabel}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      {!ariaLabel && newTabLabel ? (
        <span className="sr-only"> ({newTabLabel})</span>
      ) : null}
    </a>
  );
}
