import Image from "next/image";

import type { ProjectCover as ProjectCoverData } from "@/types/portfolio";

type ProjectCoverProps = {
  cover: ProjectCoverData;
  label?: string;
  priority?: boolean;
  sizes?: string;
};

type AbstractCover = Extract<ProjectCoverData, { kind: "abstract" }>;

const coverStyles: Record<
  AbstractCover["variant"],
  { field: string }
> = {
  satellyte: {
    field: "bg-[#071525] text-[#72a7ff]",
  },
  vision: {
    field: "bg-[#111820] text-[#a5b4c7]",
  },
  recruitment: {
    field: "bg-[#101522] text-[#7696cf]",
  },
  monitoring: {
    field: "bg-[#07191b] text-[#62a9a3]",
  },
};

function AbstractGeometry({ variant }: { variant: AbstractCover["variant"] }) {
  if (variant === "satellyte") {
    return (
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 800 600">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M92 148H258L342 232H512L620 340H724" opacity=".75" />
          <path d="M92 434H214L318 330H474L590 214H724" opacity=".32" />
          <circle cx="258" cy="148" r="9" />
          <circle cx="342" cy="232" r="15" opacity=".7" />
          <circle cx="512" cy="232" r="7" />
          <circle cx="620" cy="340" r="13" opacity=".7" />
          <circle cx="318" cy="330" r="7" />
          <circle cx="474" cy="330" r="11" opacity=".5" />
          <rect x="70" y="72" width="660" height="456" rx="2" opacity=".18" />
        </g>
      </svg>
    );
  }

  if (variant === "vision") {
    return (
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 800 600">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="76" y="84" width="648" height="432" opacity=".25" />
          <path d="M76 188h38M76 298h38M76 408h38M686 188h38M686 298h38M686 408h38" opacity=".65" />
          <rect x="152" y="154" width="182" height="118" />
          <rect x="422" y="238" width="206" height="142" opacity=".72" />
          <path d="M243 154V118M152 213h-38M525 380v45M628 309h42" opacity=".5" />
          <circle cx="243" cy="213" r="38" opacity=".3" />
          <circle cx="525" cy="309" r="22" opacity=".5" />
          <path d="M400 84v432M76 300h648" opacity=".12" />
        </g>
      </svg>
    );
  }

  if (variant === "recruitment") {
    return (
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 800 600">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M112 164H304M370 164H688M112 300H246M312 300H512M578 300H688M112 436H366M432 436H688" opacity=".36" />
          <circle cx="337" cy="164" r="33" />
          <circle cx="279" cy="300" r="33" opacity=".8" />
          <circle cx="545" cy="300" r="33" opacity=".55" />
          <circle cx="399" cy="436" r="33" opacity=".72" />
          <path d="M337 197v37l-58 33M337 197v38l208 32M279 333v34l120 36M545 333v34l-146 36" opacity=".55" />
          <rect x="78" y="88" width="644" height="424" opacity=".16" />
        </g>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 800 600">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="76" y="82" width="648" height="436" opacity=".18" />
        <path d="M104 426h52l34-104 46 64 42-178 46 139 38-79 48 118 38-152 44 109 46-55 44 138h74" />
        <path d="M104 180h592M104 300h592M104 426h592" opacity=".16" />
        <path d="M190 126v340M362 126v340M534 126v340" opacity=".12" />
        <circle cx="278" cy="208" r="7" />
        <circle cx="448" cy="234" r="7" opacity=".7" />
        <circle cx="622" cy="426" r="7" opacity=".5" />
      </g>
    </svg>
  );
}

export function ProjectCover({
  cover,
  label,
  priority = false,
  sizes = "100vw",
}: ProjectCoverProps) {
  if (cover.kind === "image") {
    return (
      <Image
        fill
        alt={cover.alt}
        className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.015]"
        priority={priority}
        sizes={sizes}
        src={cover.src}
      />
    );
  }

  const style = coverStyles[cover.variant];

  return (
    <div
      aria-label={cover.alt}
      className={`absolute inset-0 overflow-hidden ${style.field}`}
      role="img"
    >
      <AbstractGeometry variant={cover.variant} />
      {label ? (
        <div
          aria-hidden="true"
          className="absolute bottom-5 left-5 border-l border-white/60 pl-3 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-white/80 sm:bottom-7 sm:left-7"
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
