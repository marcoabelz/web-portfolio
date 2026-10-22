import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Bento } from "@/components/sections/Bento";
import { Hero } from "@/components/sections/Hero";
import { Lab } from "@/components/sections/Lab";
import { Services } from "@/components/sections/Services";
import { SelectedApps } from "@/components/sections/SelectedApps";
import { Stack } from "@/components/sections/Stack";
import { Testimonials } from "@/components/sections/Testimonials";
import { Reveal } from "@/components/ui/Reveal";
import type { HomeSectionId } from "@/types/portfolio";
import { getHomeModel } from "@/data/home";
import { isLocale } from "@/i18n/locale";

export default async function LocalizedHome({
  params: { locale },
}: {
  params: { locale: string };
}) {
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const { sections, hero, bento, apps, about, services, experience, stack, testimonials, lab, contact } = getHomeModel(locale);
  // Which sections appear, and in what order, comes from `sections`; this map only says
  // how each one renders.
  const sectionComponents: Record<HomeSectionId, (number: string) => React.ReactNode> = {
    apps: (number) => <SelectedApps model={apps} number={number} />,
    experience: (number) => <Experience model={experience} number={number} />,
    stack: (number) => <Stack model={stack} number={number} />,
    testimonials: (number) => <Testimonials model={testimonials} number={number} />,
    lab: (number) => <Lab model={lab} number={number} />,
    about: (number) => <About model={about} number={number} />,
    services: (number) => <Services model={services} number={number} />,
    contact: (number) => <Contact model={contact} number={number} />,
  };

  return (
    <>
      <Hero model={hero} />
      <Bento model={bento} />
      {sections.map(({ id, number }) => (
        <Reveal key={id}>{sectionComponents[id](number)}</Reveal>
      ))}
    </>
  );
}
