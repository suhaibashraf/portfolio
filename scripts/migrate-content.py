"""One-time, lossless text extraction from the original portfolio HTML."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]


class Element:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def all(self, tag=None, cls=None, id=None):
        result = []
        for child in self.children:
            if not isinstance(child, Element):
                continue
            if (tag is None or child.tag == tag) and (cls is None or cls in child.attrs.get('class', '').split()) and (id is None or child.attrs.get('id') == id):
                result.append(child)
            result.extend(child.all(tag, cls, id))
        return result

    def text(self):
        return re.sub(r'\s+', ' ', ''.join(c.text() if isinstance(c, Element) else c for c in self.children)).strip()


class Parser(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.root = Element()
        self.stack = [self.root]
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs)
        self.stack[-1].children.append(element)
        if tag == 'br':
            self.stack[-1].children.append(' ')
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append(element)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


def background(element):
    return '/' + re.search(r'url\(([^)]+)\)', element.attrs['style'])[1]


def run():
    archive = ROOT / 'legacy'
    archive.mkdir(exist_ok=True)
    for source in ROOT.glob('*.html'):
        target = archive / source.name
        if not target.exists():
            shutil.copy2(source, target)
    home = Parser(archive / 'index.html').root
    about = home.all(cls='about-info')[0]
    details = [{'label': li.all('span')[0].text().rstrip(':'), 'value': li.all('span')[1].text()} for li in about.all('li')]
    data = {
        'name': details[0]['value'], 'shortName': 'Sohaib',
        'roles': json.loads(home.all(cls='txt-rotate')[0].attrs['data-rotate']),
        'details': details, 'portrait': '/images/Pic.jpg', 'cv': '/CVASHRAF.pdf',
        'linkedin': 'https://www.linkedin.com/in/muhammad-sohaib',
        'phoneDisplay': '+92 3475355393',
    }
    for key, section in [('experience','page-2'),('education','page-1'),('certificates','page-4')]:
        entries = []
        for item in home.all(id=section)[0].all(cls='resume-wrap'):
            text = item.all(cls='text')[0]
            entries.append({
                'date': text.all(cls='date')[0].text(),
                'title': text.all('h2')[0].text(),
                'organization': text.all(cls='position')[0].text(),
                'paragraphs': [p.text() for p in text.all('p') if p.text()],
                'details': [li.text() for li in text.all('li')],
            })
        data[key] = entries
    skills = home.all(id='page-3')[0]
    data['specialties'] = [
        {'name': card.all('h2')[0].text(), 'value': int(card.all(cls='progress')[0].attrs['data-value'])}
        for card in skills.all(cls='bg-white')
    ]
    data['skills'] = [
        {'name': item.all('h3')[0].text(), 'value': int(item.all(cls='progress-bar')[0].all('span')[0].text().rstrip('%'))}
        for item in skills.all(cls='progress-wrap')
    ]
    projects = []
    for card in home.all(id='projects-section')[0].all(cls='project'):
        title = card.all('h3')[0].text()
        slug = {'Augmum':'augmum','KenOB1':'kenOB1','Sidewalk Robot':'sidewalk-robot','Evolutionary Flocking Shooter':'evolutionary-flocking-shooter','Fusion Fission Dynamics':'fusion-fission-dynamics','Super Nim':'super-nim','Snake and Cake':'snake-and-cake','Chefu':'chefu','Premier Polmarex':'premier-polmarex'}[title]
        tree = Parser(archive / f'{slug}.html').root
        body = tree.all(cls='col-lg-8')[0]
        sidebar = tree.all(cls='sidebar')[0]
        photos = []
        for i, img in enumerate(body.all('img'), 1):
            photos.append({'src': '/' + img.attrs['src'], 'alt': f'{title} — project image {i}'})
        projects.append({
            'slug': slug, 'title': title,
            'category': 'Games' if slug in ['super-nim','snake-and-cake'] else 'Web' if slug in ['chefu','premier-polmarex'] else 'Robotics',
            'cover': background(card),
            'paragraphs': [p.text() for p in body.all('p') if p.text()],
            'links': [{'label': a.text(), 'href': a.attrs['href']} for a in body.all('a') if a.attrs.get('href')],
            'photos': photos,
            'embeds': [iframe.attrs['src'] for iframe in body.all('iframe')],
            'videos': ['/' + source.attrs['src'] for source in body.all('source')],
            'technologies': [li.text() for li in sidebar.all(cls='categories')[0].all('li')],
            'related': [a.attrs['href'] for box in sidebar.all(cls='block-21') for a in box.all('a') if a.attrs.get('href')],
        })
    removals = json.loads((ROOT / 'scripts/content-removals.json').read_text(encoding='utf-8'))
    for project in projects:
        project['links'] = [link for link in project['links'] if link['href'] not in removals['links']]
        if project['slug'] in removals['photoProjects']:
            project['photos'] = []
        if Path(project['cover']).name in removals['images']:
            project['cover'] = ''
        project['videos'] = [video for video in project['videos'] if Path(video).name not in removals['videos']]
    data['projects'] = projects
    target = ROOT / 'src/data/portfolio.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    public = ROOT / 'public'
    public.mkdir(exist_ok=True)
    image_source = ROOT/'images' if (ROOT/'images').exists() else archive/'images'
    shutil.copytree(image_source, public/'images', dirs_exist_ok=True, ignore=shutil.ignore_patterns('.DS_Store', *removals['images'], *removals['videos']))
    pdf_source = ROOT if (ROOT/'CVASHRAF.pdf').exists() else archive
    for source in pdf_source.glob('*.pdf'):
        shutil.copy2(source, public/source.name)
    print(f'Extracted {len(projects)} projects, {len(data["experience"])} jobs, {len(data["skills"])} skills.')


if __name__ == '__main__':
    run()
