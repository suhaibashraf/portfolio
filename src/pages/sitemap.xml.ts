import type { APIRoute } from 'astro';
import { portfolio, projectUrl } from '../data/portfolio';

export const GET: APIRoute = ({ site }) => {
  const paths = ['/', ...portfolio.projects.map((project) => projectUrl(project.slug))];
  const urls = paths.map((path) => `<url><loc>${new URL(path, site).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
