"""Build the customer view chooser and its lightweight browsing pages."""
from dataclasses import dataclass
from hashlib import sha256
from html import escape
from pathlib import Path


@dataclass(frozen=True)
class View:
    key: str
    name: str
    href: str
    purpose: str
    # Familiarity, routine tasks, phone use, measured initial KB (desktop / phone), keyboard access.
    comparison: tuple


VIEWS = (
    View('classic', 'Classic menu', 'explore.html', 'Go straight to classes, passes and directions.',
         ('Widely familiar', 'Excellent', 'Good', '13 / 13 KB', 'Direct links')),
    View('directory', 'Searchable directory', 'directory.html', 'Find a page by its name or a keyword.',
         ('Widely familiar', 'Excellent', 'Excellent', '26 / 26 KB', 'Direct links')),
    View('grid', 'Visual grid', 'visual-grid.html', 'Browse the website by picture and topic.',
         ('Widely familiar', 'Good', 'Excellent', '65 / 65 KB', 'Direct links')),
    View('guide', 'First-visit guide', 'first-visit.html', 'Plan your first visit in three steps.',
         ('Familiar', 'Good for newcomers', 'Excellent', '62 / 62 KB', 'Linked steps')),
    View('map', 'Interactive floor plan', 'studio/', 'Pick a zone on the plan to explore the space.',
         ('Specialist', 'Best for layout', 'Good with zone list', '81 / 81 KB', 'Zone buttons')),
    View('walk', 'Studio walkthrough', 'studio/walkthrough/', 'Walk from reception to the reformer room.',
         ('Specialist', 'Best for a tour', 'Good in portrait', '215 / 161 KB', 'Still views available')),
    View('gallery', 'Curved gallery', 'experience.html?view=gallery', 'Drag cards around an arc and open a section.',
         ('Specialist styling', 'Best for discovery', 'Good', '43 / 43 KB', 'Previous and Next')),
    View('rail', 'Hanging card rail', 'experience.html?view=rail', 'Slide along the rail to choose a section.',
         ('Familiar swipe pattern', 'Best for discovery', 'Excellent for swiping', '43 / 43 KB', 'Previous and Next')),
)


@dataclass(frozen=True)
class Topic:
    name: str
    href: str
    summary: str
    terms: str
    art: str
    tone: str


TOPICS = (
    Topic('Studio walkthrough', 'studio/walkthrough/', 'Step inside the studio design at eye level.', 'tour rooms reception lounge reformer equipment 3d', 'practice.webp', 'green'),
    Topic('Classes', 'schedule.html', 'Check class information and timetable updates.', 'practice schedule booking timetable time availability', 'classes', 'peach'),
    Topic('Passes', 'passes.html', 'Find the latest on passes, prices and terms.', 'price pricing cost rates membership fees payment', 'passes', 'gold'),
    Topic('Directions', 'directions.html', 'Open the map pin and plan your journey.', 'location address map find arrival where travel', 'directions', 'sage'),
    Topic('Instructors', 'instructors.html', 'Find information about the teaching team.', 'trainer teachers coaches people team', 'people', 'lilac'),
    Topic('Interactive floor plan', 'studio/', 'Explore the studio layout in 2D or 3D.', 'map rooms building layout zones space model', 'plan', 'sage'),
    Topic('About Paila', 'about.html', 'Read the introduction to Paila Pilates.', 'story philosophy about studio', 'about', 'moss'),
    Topic('Contact', 'contact.html', 'Find contact information and the shared location pin.', 'help reach email phone address enquiry inquiry', 'reception-small.webp', 'peach'),
    Topic('Member services', 'member.html', 'Check the status of member accounts and services.', 'login sign in bookings membership account', 'passes', 'cream'),
)


def asset_url(root, path):
    version = sha256((root / path).read_bytes()).hexdigest()[:12]
    return f'{path}?v={version}'


def link(href, label, css=''):
    klass = f' class="{css}"' if css else ''
    return f'<a{klass} href="{escape(href, quote=True)}">{escape(label)}</a>'


def page(root, title, description, body, *, home=False, interactive=False):
    stylesheet = asset_url(root, 'assets/css/views.css')
    script = (f'<script defer src="{asset_url(root, "assets/js/views.js")}"></script>'
              if interactive else '')
    visit_link = link('explore.html', 'Site menu', 'nav-pill') if home else link('index.html', 'Change view', 'nav-pill')
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#f9f6ef">
  <meta name="description" content="{escape(description, quote=True)}">
  <title>{escape(title)} | Paila Pilates</title>
  <link rel="stylesheet" href="{stylesheet}">{script}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="mast"><div class="shell mast-inner">
    <a class="wordmark" href="index.html" aria-label="Paila Pilates home"><span class="monogram" aria-hidden="true">P</span><span>PAILA <b>PILATES</b></span></a>
    <nav aria-label="Main navigation">{link('schedule.html', 'Classes')}{link('directions.html', 'Directions')}{visit_link}</nav>
  </div></header>
  <main id="main" class="shell">{body}</main>
  <footer class="shell foot"><strong>Paila Pilates</strong><nav aria-label="Footer">{link('index.html', 'All views')}{link('directory.html', 'Directory')}{link('contact.html', 'Contact')}</nav></footer>
</body>
</html>
'''


def art_library(root):
    # The gallery already owns the studio's six editorial illustrations.
    gallery = (root / 'experience.html').read_text()
    start = gallery.index('<svg class="art-library"')
    end = gallery.index('</svg>', start) + len('</svg>')
    return gallery[start:end]


def artwork(key):
    return f'<svg class="illustration" viewBox="0 0 300 330" aria-hidden="true"><use href="#art-{key}"/></svg>'


def thumbnail(key):
    # Each miniature previews the interaction shown when the link opens.
    thumbnails = {
        'classic': '<div class="sample-page"><i></i><i></i><i></i><b></b><b></b></div>',
        'directory': '<div class="sample-search"><span></span><i></i><i></i><i></i></div>',
        'grid': '<div class="sample-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>',
        'guide': '<div class="sample-steps"><i></i><i></i><i></i></div>',
        'map': '<img loading="lazy" src="studio/plan.svg" alt="" width="190" height="170">',
        'walk': '<img loading="lazy" src="assets/views/practice.webp" alt="" width="520" height="325">',
        'gallery': '<div class="sample-arc"><i></i><i></i><i></i><i></i><i></i></div>',
        'rail': '<div class="sample-rail"><i></i><i></i><i></i><i></i><i></i></div>',
    }
    return f'<div class="thumbnail thumb-{key}" aria-hidden="true">{thumbnails[key]}</div>'


def chooser(root):
    choices = ''.join(f'<option value="{v.key}">{v.name}</option>' for v in VIEWS)
    cards = '\n'.join(f'''<a class="view-card" href="{v.href}" data-mode="{v.key}">
      {thumbnail(v.key)}<div class="tile-copy"><h3>{v.name}</h3><p>{v.purpose}</p></div></a>''' for v in VIEWS)
    body = f'''<section class="entry">
    <div class="entry-copy">
      <h1>Choose your <em>view.</em></h1>
      <p>Find a class, plan your first visit, or walk through the Paila Pilates studio.</p>
      <div id="quick-choice" class="picker" hidden>
        <label class="sr" for="mode-choice">Website view</label>
        <span class="select-wrap"><select id="mode-choice">{choices}</select></span>
        {link(VIEWS[0].href, 'Open view', 'action primary')}
      </div>
    </div>
    <figure class="cover">
      <img src="assets/views/reception.webp" srcset="assets/views/reception-small.webp 480w, assets/views/reception.webp 840w" sizes="(max-width: 690px) 95vw, (max-width: 1200px) 48vw, 580px" width="840" height="490" fetchpriority="high" alt="The curved reception desk and ring lights in the Paila studio design.">
      <figcaption>Studio design <span>·</span> Reception</figcaption>
    </figure>
  </section>
  <section class="choose-section" aria-labelledby="all-views"><div class="section-head"><h2 id="all-views">Explore in eight ways</h2>{link('compare-views.html','Compare views','text-link')}</div>
    <div class="view-grid">{cards}</div>
  </section>'''
    return page(root, 'Choose your view', 'Choose from eight ways to browse Paila Pilates.', body, home=True, interactive=True)


def directory(root):
    items = '\n'.join(f'''<li data-keywords="{escape(topic.terms, quote=True)}">
      <a href="{topic.href}"><strong>{topic.name}</strong><span>{topic.summary}</span></a></li>'''
        for topic in sorted(TOPICS, key=lambda t: t.name))
    body = f'''<section class="reading">
    <header class="page-intro"><h1>Searchable <em>directory.</em></h1>
    <p>Find a page by topic. Try “price”, “trainer” or “map”.</p></header>
    <form id="directory-search" role="search" hidden>
      <label for="topic-query">Search pages</label>
      <div class="search-box"><input type="search" id="topic-query" name="q" autocomplete="off" placeholder="Search the website">
      <button type="button" id="clear-search" hidden>Clear</button></div>
    </form>
    <p id="result-count" class="count" role="status"></p>
    <ul class="results" id="topic-list">{items}</ul>
  </section>'''
    return page(root, 'Searchable directory', 'Search the public pages of Paila Pilates.', body, interactive=True)


def visual_grid(root):
    cards = []
    for t in TOPICS:
        if t.art.endswith('webp'):
            graphic = f'<img src="assets/views/{t.art}" loading="lazy" width="520" height="325" alt="">'
        elif t.art == 'plan':
            graphic = '<img class="plan-image" src="studio/plan.svg" loading="lazy" width="180" height="195" alt="">'
        else:
            graphic = artwork(t.art)
        cards.append(f'''<a class="topic-card" href="{t.href}"><div class="topic-image {t.tone}" aria-hidden="true">{graphic}</div><div class="tile-copy"><h2>{t.name}</h2><p>{t.summary}</p></div></a>''')
    body = f'''<header class="page-intro"><h1>Visual <em>grid.</em></h1><p>Choose a picture to open that part of Paila.</p></header>
    <div class="topics">{''.join(cards)}</div>{art_library(root)}'''
    return page(root, 'Visual grid', 'Browse the public website by picture and topic.', body)


STEPS = (
    ('studio', 'Meet the studio', 'Start with the space', 'See the curved reception desk, the lounge and the reformer room in the studio design.',
     'lounge.webp', 'The seating area in the studio design.', (('studio/walkthrough/', 'Walk through the studio'), ('studio/', 'View the floor plan'), ('about.html', 'About Paila'))),
    ('practice', 'Explore classes', 'Get to know the practice', 'Read the class and pass information, then check the teaching team. The timetable and prices are awaiting confirmation.',
     'practice.webp', 'Reformers in the Paila studio design.', (('schedule.html', 'Class information'), ('passes.html', 'Passes and pricing'), ('instructors.html', 'Meet the instructors'))),
    ('arrival', 'Plan your arrival', 'Find your way here', 'Use Paila’s shared map pin to plan the journey. Check the contact page for updates before you come.',
     'arrival.webp', 'The glazed entrance in the Paila studio design.', (('directions.html', 'Get directions'), ('contact.html', 'Contact Paila'))),
)


def first_visit(root):
    step_links = ''.join(f'<li><a href="#{s[0]}"><span>{i}</span>{s[1]}</a></li>' for i, s in enumerate(STEPS, 1))
    panels = []
    for i, (slug, name, heading, copy, photo, alt, destinations) in enumerate(STEPS):
        destinations = ''.join(link(href, label, 'topic-link') for href, label in destinations)
        back = link('#' + STEPS[i-1][0], 'Previous step') if i else ''
        forward = link('#' + STEPS[i+1][0], 'Next step', 'action primary') if i+1 < len(STEPS) else link('index.html', 'Choose another view', 'action primary')
        panels.append(f'''<section class="step-panel" id="{slug}" aria-labelledby="heading-{slug}">
      <div class="step-photo"><img src="assets/views/{photo}" width="500" height="313" alt="{alt}" loading="lazy"></div>
      <div class="step-body"><p class="step-count">Step {i+1} of {len(STEPS)}</p><h2 tabindex="-1" id="heading-{slug}">{heading}</h2><p>{copy}</p>
        <div class="destinations">{destinations}</div><nav class="step-actions" aria-label="{name} controls">{back}{forward}</nav></div></section>''')
    body = f'''<header class="page-intro"><h1>First-visit <em>guide.</em></h1><p>Three stops to get ready for a visit to Paila.</p></header>
    <nav class="step-nav" aria-label="First visit steps"><ol>{step_links}</ol></nav>{''.join(panels)}'''
    return page(root, 'First-visit guide', 'Explore the studio, classes and directions in three steps.', body, interactive=True)


def comparison(root):
    columns = ('Familiarity', 'Routine tasks', 'Phone use', 'First load, desktop / phone', 'Keyboard / low motion')
    rows = '\n'.join('<tr><th scope="row">'+link(v.href, v.name)+'</th>'+
                     ''.join(f'<td>{escape(value)}</td>' for value in v.comparison)+'</tr>' for v in VIEWS)
    headings = ''.join(f'<th scope="col">{c}</th>' for c in columns)
    sources = (
        ('https://www.nngroup.com/articles/hamburger-menus/', 'Visible navigation research'),
        ('https://designsystem.digital.gov/components/card/', 'Card design guidance'),
        ('https://designsystem.digital.gov/components/step-indicator/', 'Step indicators'),
        ('https://www.w3.org/WAI/tutorials/carousels/', 'Accessible carousels'),
        ('https://www.w3.org/WAI/tutorials/images/imagemap/', 'Accessible image maps'),
    )
    body = f'''<header class="page-intro"><h1>Compare the <em>views.</em></h1>
      <p>Choose by what you came to do.</p></header>
      <div class="picks">
        <article><h2>Everyday visits</h2><p>Use the {link('explore.html','classic menu')} for obvious links, or the {link('directory.html','directory')} if you know a keyword.</p></article>
        <article><h2>First time here</h2><p>The {link('first-visit.html','first-visit guide')} takes you from the studio to class information and directions.</p></article>
        <article><h2>A feel for the space</h2><p>Open the {link('studio/walkthrough/','walkthrough')} for an eye-level visit, or the {link('studio/','floor plan')} to see the layout.</p></article>
      </div>
      <section class="compare"><h2>Eight views, five criteria</h2>
      <p>Familiarity estimates how common the pattern feels across websites. Paila visitor popularity is unmeasured. Routine tasks include finding classes, passes and directions. Smaller first loads usually open sooner on slow connections. The last column shows ways to browse using a keyboard or less motion.</p>
      <div class="table-scroll" role="region" aria-label="View comparison, scroll sideways on a small screen" tabindex="0">
      <table><caption class="sr">Paila website view comparison. Browsing ratings are editorial assessments. First-load figures are measured.</caption>
      <thead><tr><th scope="col">View</th>{headings}</tr></thead><tbody>{rows}</tbody></table></div>
      <details class="source-note"><summary>Measurements and sources</summary>
      <p>First-load figures are rounded kilobytes (1 KB = 1,000 bytes). On 23 November 2026, each view opened in Chrome with a fresh set of asset URLs, in desktop and 390-pixel portrait viewports. We counted the page and its requested resources 3.2 seconds after load, before interaction. Network speed and device hardware also affect elapsed time.</p>
      <p>The previous tour loaded 802 KB on desktop and 549 KB at phone width. The new tour uses smaller frames while you move and loads original detail when you pause. The chooser loads no animation frames. Switching the floor plan to 3D or moving through the tour requests more data.</p>
      <p>Familiarity, practicality and phone use are editorial assessments of these layouts. The comparison draws on the following guidance.</p><ul>
      {''.join('<li>'+link(url, title)+'</li>' for url,title in sources)}</ul></details></section>'''
    return page(root, 'Compare views', 'Compare eight website views by familiarity, practicality, mobile use, speed and accessibility.', body)


def build_views(root):
    for filename, render in (
        ('index.html', chooser), ('directory.html', directory), ('visual-grid.html', visual_grid),
        ('first-visit.html', first_visit), ('compare-views.html', comparison),
    ):
        (root / filename).write_text(render(root), encoding='utf-8')


if __name__ == '__main__':
    build_views(Path(__file__).resolve().parent)
