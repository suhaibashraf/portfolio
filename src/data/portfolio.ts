import data from './portfolio.json';

export type Project = (typeof data.projects)[number];
export interface ResumeEntry {
  date: string;
  title: string;
  organization: string;
  paragraphs: string[];
  details: string[];
}
export const portfolio = data;
export const projectCategories = (project: { category: string; additionalCategories?: string[] }) =>
  [...new Set([project.category, ...(project.additionalCategories ?? [])])];
export const categories = [...new Set(data.projects.flatMap(projectCategories))];
export const projectUrl = (slug: string) => `/${slug}.html`;
