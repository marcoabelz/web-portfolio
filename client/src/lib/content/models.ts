export type TechIcon =
  | { kind: "brand"; slug: string; title: string }
  | { kind: "monogram"; text: string };

export type TechTag = { name: string; icon: TechIcon };

export type ImageModel = { src: string; width: number; height: number; alt: string };
