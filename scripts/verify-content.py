"""Verify built pages against the current, editable portfolio content and assets."""
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
from hashlib import sha256
import json
import re

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location('migration', ROOT / 'scripts/migrate-content.py')
migration = module_from_spec(spec)
spec.loader.exec_module(migration)
Parser = migration.Parser
portfolio = json.loads((ROOT / 'src/data/portfolio.json').read_text(encoding='utf-8'))
removals = json.loads((ROOT / 'scripts/content-removals.json').read_text(encoding='utf-8'))
removed_media = removals['images'] + removals['videos']
errors = []
checks = 0


def normalize(text):
    return re.sub(r'[\s•]+', '', str(text))


def contains(value, output, label):
    global checks
    checks += 1
    if normalize(value) not in normalize(output):
        errors.append(f'{label}: missing {value!r}')


home = Parser(ROOT / 'dist/index.html').root
home_text = home.text()
for value in [portfolio['name'], portfolio['shortName'], portfolio['phoneDisplay'], *portfolio['roles']]:
    contains(value, home_text, 'home')
for detail in portfolio['details']:
    contains(detail['value'], home_text, 'home/contact')
for group in ['experience', 'education', 'certificates']:
    for entry in portfolio[group]:
        for value in [entry['date'], entry['title'], entry['organization'], *entry['paragraphs'], *entry['details']]:
            contains(value, home_text, group)
for skill in portfolio['skills'] + portfolio['specialties']:
    contains(skill['name'], home_text, 'home/skills')
    contains(str(skill['value']) + '%', home_text, 'home/skill-rating')

for project in portfolio['projects']:
    page = ROOT / 'dist' / (project['slug'] + '.html')
    if not page.exists():
        errors.append(f'Missing project route: {project["slug"]}')
        continue
    built = Parser(page).root
    for value in [project['title'], *project['paragraphs'], *project['technologies']]:
        contains(value, built.text(), project['slug'])
    sources = [item.attrs.get('src') for tag in ['img', 'iframe', 'source'] for item in built.all(tag)]
    expected_sources = ([project['cover']] if project['cover'] else []) + [photo['src'] for photo in project['photos']] + project['embeds'] + project['videos']
    for source in expected_sources:
        checks += 1
        if source not in sources:
            errors.append(f'{project["slug"]}: missing media {source}')
    gallery_sources = [image.attrs.get('src') for gallery in built.all(cls='photo-grid') for image in gallery.all('img')]
    checks += 1
    if project['cover'] and project['cover'] in gallery_sources:
        errors.append(f'{project["slug"]}: cover image repeats in photo gallery')
    links = [a.attrs.get('href') for a in built.all('a')]
    for link in project['links']:
        checks += 1
        if link['href'] not in links:
            errors.append(f'{project["slug"]}: missing link {link["href"]}')

# The current public assets are authoritative, so replacing a CV or photo is supported.
for source in (ROOT / 'public').rglob('*'):
    if source.is_file() and not source.name.startswith('.'):
        relative = source.relative_to(ROOT / 'public')
        output = ROOT / 'dist' / relative
        checks += 1
        if not output.exists() or sha256(source.read_bytes()).digest() != sha256(output.read_bytes()).digest():
            errors.append(f'Changed or missing asset: {relative}')

# Explicit removal requests remain enforced when content is edited later.
for name in removed_media:
    for folder in ['public/images', 'legacy/images', 'dist/images']:
        checks += 1
        if (ROOT / folder / name).exists():
            errors.append(f'Removed media must not be present: {folder}/{name}')
for page in (ROOT / 'dist').glob('*.html'):
    output = page.read_text(encoding='utf-8')
    for removed in removals['links'] + ['images/' + name for name in removed_media]:
        checks += 1
        if removed in output:
            errors.append(f'{page.name}: removed link or media is still referenced: {removed}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'Content validation passed: {checks} checks against current portfolio data and assets.')
