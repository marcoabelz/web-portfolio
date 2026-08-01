import { getPortfolioContent } from "@/data/portfolio";
import { getArchiveProjects, getSelectedProjects } from "@/data/projects";
import { routing } from "@/i18n/routing";
import type { ArchiveProject, Language, SelectedProject } from "@/types/portfolio";

const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");

// ponytail: English context only — the system instruction makes the model reply in the
// visitor's language, verified against Indonesian questions.
const content = getPortfolioContent(routing.defaultLocale);
const selectedProjects = getSelectedProjects(routing.defaultLocale);
const archiveProjects = getArchiveProjects(routing.defaultLocale);

function profileSection(): string {
  const { profile } = content;

  return [
    "## Profile",
    `Name: ${profile.name}`,
    `Title: ${profile.title}`,
    `Specialty: ${profile.specialty}`,
    `Location: ${profile.location}`,
    `Email: ${profile.email}`,
    `Availability: ${profile.availability}`,
    `Resume: ${profile.resumePath}`,
    `Introduction: ${profile.introduction}`,
    `About: ${content.aboutParagraphs.join(" ")}`,
  ].join("\n");
}

function experienceSection(): string {
  const roles = content.experiences.map((role) =>
    [
      `### ${role.company} — ${role.title}`,
      `Period: ${role.start} – ${role.end} (${role.location})`,
      role.summary,
      bullets(role.highlights),
      `Stack: ${role.stack.join(", ")}`,
    ].join("\n"),
  );

  return ["## Experience", ...roles].join("\n\n");
}

function selectedProjectsSection(): string {
  const projects = selectedProjects.map((project: SelectedProject) =>
    [
      `### ${project.name} — ${project.descriptor}`,
      `Context: ${project.contextLabel} | Role: ${project.role}`,
      `Access: ${project.privacy === "public" ? project.liveUrl : "private, no public link"}`,
      `Outcome: ${project.outcome}`,
      bullets(project.highlights),
      `Stack: ${project.stack.join(", ")}`,
      `Overview: ${project.caseStudy.overview.join(" ")}`,
      `Features: ${project.caseStudy.features.join(" ")}`,
      `Responsibilities: ${project.caseStudy.responsibilities.join(" ")}`,
    ].join("\n"),
  );

  return ["## Selected projects", ...projects].join("\n\n");
}

function archiveSection(): string {
  const projects = archiveProjects.map(
    (project: ArchiveProject) =>
      `- ${project.name} (${project.contextLabel}) — ${project.descriptor}. Stack: ${project.stack.join(", ")}. Repository: ${project.repositoryUrl ?? "not public"}`,
  );

  return ["## Earlier and side projects", ...projects].join("\n");
}

function skillsSection(): string {
  const groups = content.skillGroups.map((group) => `${group.title}: ${group.skills.join(", ")}`);

  return ["## Skills", ...groups].join("\n");
}

function educationSection(): string {
  const entries = content.education.map(
    (entry) => `${entry.institution} — ${entry.program} (${entry.period}). ${entry.result}`,
  );

  return ["## Education", ...entries].join("\n");
}

function languagesSection(): string {
  const entries = content.languages.map(
    (language: Language) =>
      `${language.name}: ${language.proficiency}${language.evidence ? ` (${language.evidence})` : ""}`,
  );

  return ["## Languages", ...entries].join("\n");
}

function linksSection(): string {
  const links = content.socialLinks.map((link) => `${link.label}: ${link.href}`);

  return ["## Links", ...links].join("\n");
}

export function buildPortfolioContext(): string {
  return [
    profileSection(),
    experienceSection(),
    selectedProjectsSection(),
    archiveSection(),
    skillsSection(),
    educationSection(),
    languagesSection(),
    linksSection(),
  ].join("\n\n");
}
