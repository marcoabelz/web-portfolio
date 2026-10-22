import enCommon from "../../messages/en/common.json";
import enPortfolio from "../../messages/en/portfolio.json";
import enProjects from "../../messages/en/projects.json";
import idCommon from "../../messages/id/common.json";
import idPortfolio from "../../messages/id/portfolio.json";
import idProjects from "../../messages/id/projects.json";

import type { Locale } from "./locale";

export type CommonMessages = typeof enCommon;
export type PortfolioMessages = typeof enPortfolio;
export type ProjectMessages = typeof enProjects;

export type Messages = {
  common: CommonMessages;
  portfolio: PortfolioMessages;
  projects: ProjectMessages;
};

export type MessageDomain = keyof Messages;

const messagesByLocale: Record<Locale, Messages> = {
  en: {
    common: enCommon,
    portfolio: enPortfolio,
    projects: enProjects,
  },
  id: {
    common: idCommon,
    portfolio: idPortfolio,
    projects: idProjects,
  },
};

export function getAllMessages(): Record<Locale, Messages> {
  return messagesByLocale;
}

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale];
}
