import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { Contact } from "@/components/sections/Contact";
import { Credentials } from "@/components/sections/Credentials";
import { Experience } from "@/components/sections/Experience";
import { Hero } from "@/components/sections/Hero";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { Skills } from "@/components/sections/Skills";
import { Reveal } from "@/components/ui/Reveal";
import type { ProjectCardProject } from "@/components/work/ProjectCard";
import { getPortfolioContent } from "@/data/portfolio";
import { getSelectedProjects } from "@/data/projects";
import { isLocale, localizePath } from "@/i18n/locale";
import { getMessages } from "@/i18n/messages";

function formatMessage(message: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    message,
  );
}

export default async function LocalizedHome({
  params: { locale },
}: {
  params: { locale: string };
}) {
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const portfolio = getPortfolioContent(locale);
  const selectedProjects = getSelectedProjects(locale);
  const messages = getMessages(locale);
  const { common } = messages;
  const heroProfile = {
    name: portfolio.profile.name,
    nickname: portfolio.profile.nickname,
    title: portfolio.profile.title,
    specialty: portfolio.profile.specialty,
    resumePath: portfolio.profile.resumePath,
  };
  const contactProfile = {
    name: portfolio.profile.name,
    email: portfolio.profile.email,
    availability: portfolio.profile.availability,
    location: portfolio.profile.location,
  };
  const projectCards = selectedProjects.map((project): ProjectCardProject => {
    const card = {
      slug: project.slug,
      name: project.name,
      descriptor: project.descriptor,
      contextLabel: project.contextLabel,
      role: project.role,
      outcome: project.outcome,
      highlights: project.highlights,
      stack: project.stack,
      cover: project.cover,
    };

    return project.privacy === "public"
      ? { ...card, privacy: "public", liveUrl: project.liveUrl }
      : { ...card, privacy: "private" };
  });
  const experiences = portfolio.experiences.map((experience) => ({
    company: experience.company,
    title: experience.title,
    location: experience.location,
    start: experience.start,
    end: experience.end,
    startDate: experience.startDate,
    endDate: experience.endDate,
    summary: experience.summary,
    highlights: experience.highlights,
    stack: experience.stack,
  }));
  const skillGroups = portfolio.skillGroups.map((group) => ({
    title: group.title,
    skills: group.skills,
  }));
  const education = portfolio.education.map((item) => ({
    institution: item.institution,
    program: item.program,
    period: item.period,
    result: item.result,
  }));
  const languages = portfolio.languages.map((language) => (
    language.evidence
      ? {
          name: language.name,
          proficiency: language.proficiency,
          evidence: language.evidence,
        }
      : {
          name: language.name,
          proficiency: language.proficiency,
        }
  ));
  const coverLabels = {
    satellyte: common.labels.signalIntelligence,
    vision: common.labels.industrialVision,
    recruitment: common.labels.talentPipeline,
    monitoring: common.labels.plantTelemetry,
  };

  return (
    <>
      <Hero
        profile={heroProfile}
        facts={portfolio.aboutFacts}
        paragraphs={portfolio.aboutParagraphs}
        links={{
          work: localizePath("/#work", locale),
          contact: localizePath("/#contact", locale),
        }}
        labels={{
          viewSelectedWork: common.actions.viewSelectedWork,
          downloadResume: common.actions.downloadResume,
          getInTouch: common.actions.getInTouch,
          portraitAlt: portfolio.profile.name,
        }}
      />
      <Reveal>
        <SelectedWork
          projects={projectCards}
          archiveHref={localizePath("/work/archive", locale)}
          caseStudyHref={(slug) => localizePath(`/work/${slug}`, locale)}
          labels={{
            ...common.sections.selectedWork,
            browseEarlierProjects: common.actions.browseEarlierProjects,
            viewCaseStudy: common.actions.viewCaseStudy,
            liveProduct: common.actions.liveProduct,
            privateProject: common.labels.privateProject,
            projectHighlights: common.accessibility.projectHighlights,
            technologyStack: common.accessibility.technologyStack,
            openLiveProduct: (projectName) => formatMessage(
              common.accessibility.openLiveProduct,
              { projectName },
            ),
            newTabLabel: common.accessibility.opensInNewTab,
            coverLabels,
          }}
        />
      </Reveal>
      <Reveal>
        <Experience
          experiences={experiences}
          labels={{
            ...common.sections.experience,
            technologyStack: (company) => formatMessage(
              common.accessibility.experienceTechnologyStack,
              { company },
            ),
          }}
        />
      </Reveal>
      <Reveal>
        <Skills groups={skillGroups} labels={common.sections.skills} />
      </Reveal>
      <Reveal>
        <Credentials
          education={education}
          languages={languages}
          labels={common.sections.credentials}
        />
      </Reveal>
      <Reveal>
        <Contact
          profile={contactProfile}
          socialLinks={portfolio.socialLinks}
          labels={{
            ...common.sections.contact,
            basedIn: (location) => formatMessage(common.labels.basedIn, { location }),
            contactOnSocial: (name, platform) => formatMessage(
              common.accessibility.contactOnSocial,
              { name, platform },
            ),
            newTabLabel: common.accessibility.opensInNewTab,
          }}
        />
      </Reveal>
    </>
  );
}
