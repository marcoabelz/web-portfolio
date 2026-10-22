import type { ReactNode } from "react";

type CardProps = {
  as?: "div" | "a" | "article";
  href?: string;
  /** Adds the hover lift. Links are always interactive. */
  interactive?: boolean;
  className?: string;
  "data-card"?: string;
  children?: ReactNode;
};

export function Card({ as, href, interactive = false, className, children, "data-card": dataCard }: CardProps) {
  const Tag = as ?? (href ? "a" : "div");
  const classes = `card${interactive || Tag === "a" ? " card-hover" : ""}${className ? ` ${className}` : ""}`;

  if (Tag === "a") {
    return (
      <a className={classes} href={href} data-card={dataCard}>
        {children}
      </a>
    );
  }
  return <Tag className={classes} data-card={dataCard}>{children}</Tag>;
}
