import data from './portfolio.json';
import { withBase } from '../lib/urls';

export type Project = (typeof portfolio.projects)[number];
export interface ResumeEntry {
  date: string;
  title: string;
  organization: string;
  paragraphs: string[];
  details: string[];
}
export const portfolio = {
  ...data,
  portrait: withBase(data.portrait),
  cv: withBase(data.cv),
  projects: data.projects.map((project) => ({
    ...project,
    cover: withBase(project.cover),
    photos: project.photos.map((photo) => ({ ...photo, src: withBase(photo.src) })),
    videos: project.videos.map(withBase),
    embeds: project.embeds.map(withBase),
    links: project.links.map((link) => ({ ...link, href: withBase(link.href) })),
  })),
};
export const projectCategories = (project: { category: string; additionalCategories?: string[] }) =>
  [...new Set([project.category, ...(project.additionalCategories ?? [])])];
export const categories = [...new Set(data.projects.flatMap(projectCategories))];
export const projectUrl = (slug: string) => withBase(`/${slug}.html`);
