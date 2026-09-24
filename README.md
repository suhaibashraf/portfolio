# Sohaib's portfolio

A static, responsive portfolio built with **Astro 7, TypeScript, and modern CSS**.
The original portfolio information, descriptions, dates, skill ratings, images,
project links, and CV are preserved. No client-side framework is required.

## Development

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run dev
```

For this Windows workspace, run this from the project terminal:

```powershell
.\scripts\dev.cmd
```

Open **http://127.0.0.1:4322** and keep the terminal running. Saved edits to
`src/data/portfolio.json` update automatically. This launcher uses installed Node.js
or the portable runtime in `.tools/`, and works when PowerShell blocks `.ps1` scripts.
No execution-policy change is required. Stop the development server with Ctrl+C.

The production preview on port **4321** serves the last build in `dist/`; it does
not pick up source edits until `npm run build` is run again. Use port **4322** for
editing. Running `npm run dev` directly uses Astro's default port, normally 4321.

```sh
npm run check     # Astro and TypeScript diagnostics
npm run build     # Generate dist/
npm run preview   # Preview the production build
```

## Structure

```text
src/
  components/       Shared header, footer, project cards, resume entries, icons
  data/             Portfolio content and TypeScript types
  layouts/          Shared document shell and page metadata
  pages/            Home, generated project pages, 404, and sitemap
  styles/           Responsive design tokens and site styles
public/             Original images, video, PDFs, favicon, and robots.txt
tests/              Browser, accessibility, and navigation checks
scripts/            Content migration and preservation verification
legacy/             Original source snapshot, excluded from the build
```

Edit `src/data/portfolio.json` to update portfolio information.
The home page's **Resume** button opens `/resume.html`, which embeds the PDF selected
by the `cv` field in that file. Replace `public/CVASHRAF.pdf` to update the existing
CV. The viewer also offers direct open and download links for browsers that do not
support embedded PDFs.

Shared components
render every project from the same structure. Existing project slugs, capitalization,
`.html` pages, and remaining home section anchors are retained. The duplicate About
block and its navigation link were removed on request. Internal links use explicit
`.html` paths; GitHub Pages also resolves the original extensionless project paths.

The untracked `suhaibashraf.github.io/` directory that was already in the workspace
is not part of this application or its build.

## Verification

```sh
npx playwright install chromium
npm run check
npm run build
python scripts/verify-content.py
npm test
```

The content verifier requires Python 3.11+ (standard library only). It compares
the generated site with the current `src/data/portfolio.json` and checks public
asset hashes, including PDFs. Intentional edits to your content do not require
updating old counts or the original migration baseline. Explicit photo/video and
link removals in `scripts/content-removals.json` remain enforced.
The browser suite checks all project pages, mobile overflow, filtering, keyboard
navigation, JavaScript-disabled access, accessibility, CV downloads, and routes.
Accessibility scans cover site-owned markup and iframe labels; the third-party
YouTube player's internal markup is outside this project's control and excluded.
To use an installed Chrome browser on Windows, set `PLAYWRIGHT_CHANNEL=chrome`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` checks and builds pull requests.
Pushes to `main` build, test, and deploy **only `dist/`** using GitHub Pages Actions.
In the repository's **Settings → Pages**, select **GitHub Actions** as the source.
The configured site URL is `https://suhaibashraf.github.io`.

The rebuild has not been published simply by editing this workspace. A push to
`main` or a manual workflow run triggers deployment after the checks pass.

## Preservation notes

- Requested contact update: address is now Parmelia WA 6167 and phone is 0466606073.
  The original snapshot and PDFs remain unchanged; preservation checks account for this update.
- Content is migrated from the existing working files, including local edits.
- Dates such as “Mar 2021 - Now” are retained without assuming newer career facts.
- The Machine Learning skill label originally displayed 80% while its bar was 75%.
  The rebuilt accessible meter uses the visible **80%** value.
- Remaining media and both CV PDFs are copied without modification. Sidewalk Robot's
  gallery photos and video demo were removed from public assets and the local
  archive on request. Its cover image and project description are retained.
  Chefu's original photos and cover are retained; its GitHub link is removed.
- Removed project links and confidential image filenames are recorded in
  `scripts/content-removals.json`; verification prevents them entering the build.
- Project images have descriptive labels, and videos keep their existing sources.
- The original Colorlib attribution remains in the footer.
- Fonts are self-hosted with system fallbacks; pages do not request Google Fonts.

Built following the [Astro static deployment documentation](https://docs.astro.build/en/guides/deploy/github/).
