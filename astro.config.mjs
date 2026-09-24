import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://suhaibashraf.github.io',
  base: '/portfolio',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    server: { strictPort: true },
    plugins: [{
      name: 'portfolio-dev-status',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/__portfolio-dev-status', (_request, response) => {
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify({ app: 'sohaib-portfolio-dev', root: server.config.root }));
        });
      },
    }],
  },
});
