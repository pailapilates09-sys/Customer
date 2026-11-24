"""Render the public site's constellation from the same pages as the directory."""
from collections import Counter
from dataclasses import dataclass
from html import escape
from textwrap import wrap


@dataclass(frozen=True)
class Node:
    key: str
    href: str
    group: str
    wide: tuple
    compact: tuple


NODES = (
    Node('paila', 'explore.html', 'home', (357, 157), (171, 178)),
    Node('classes', 'schedule.html', 'practice', (195, 109), (86, 106)),
    Node('passes', 'passes.html', 'practice', (79, 52), (48, 30)),
    Node('instructors', 'instructors.html', 'practice', (272, 38), (166, 35)),
    Node('members', 'member.html', 'practice', (62, 180), (43, 204)),
    Node('walk', 'studio/walkthrough/', 'studio', (505, 96), (236, 103)),
    Node('plan', 'studio/', 'studio', (628, 44), (286, 27)),
    Node('about', 'about.html', 'studio', (642, 167), (289, 208)),
    Node('guide', 'first-visit.html', 'visit', (233, 251), (91, 290)),
    Node('directions', 'directions.html', 'visit', (450, 267), (204, 287)),
    Node('contact', 'contact.html', 'visit', (605, 285), (266, 372)),
)

# Editorial relationships between public pages, independent of shared navigation bars.
EDGES = (
    ('paila', 'classes'), ('paila', 'walk'), ('paila', 'about'), ('paila', 'guide'),
    ('classes', 'passes'), ('classes', 'instructors'), ('passes', 'members'),
    ('classes', 'guide'), ('guide', 'directions'), ('walk', 'plan'),
    ('plan', 'about'), ('about', 'contact'), ('directions', 'contact'),
    ('walk', 'guide'),
)


def graph_thumbnail():
    return '''<svg viewBox="0 0 200 106" fill="none" aria-hidden="true">
        <g stroke="#80998a" stroke-width="1.4"><path d="M21 58 60 34 97 55 139 23 179 44 151 78 97 55 62 83 21 58 M60 34 62 83 M139 23 151 78"/></g>
        <g stroke="#f9faf1" stroke-width="2"><g fill="#477967"><circle cx="21" cy="58" r="5"/><circle cx="60" cy="34" r="7"/></g>
        <g fill="#866c98"><circle cx="139" cy="23" r="6"/><circle cx="179" cy="44" r="5.5"/></g>
        <g fill="#ad684b"><circle cx="62" cy="83" r="6"/><circle cx="151" cy="78" r="7"/></g>
        <circle cx="97" cy="55" r="11" fill="#244a3d"/></g><circle cx="97" cy="55" r="14" stroke="#567c68"/></svg>'''


def graph_body(catalog):
    by_key = {node.key: node for node in NODES}
    degree = Counter(key for pair in EDGES for key in pair)
    links = []
    for left, right in EDGES:
        x1, y1 = by_key[left].wide
        x2, y2 = by_key[right].wide
        # Route the cross-group connection around the central page and its label.
        bend = ('460 258', '243 276') if (left, right) == ('walk', 'guide') else None
        control = f'Q{bend[0]} ' if bend else 'L'
        attrs = f' data-wide-bend="{bend[0]}" data-compact-bend="{bend[1]}"' if bend else ''
        links.append(f'<path data-from="{left}" data-to="{right}"{attrs} d="M{x1} {y1} {control}{x2} {y2}"/>')

    points = []
    pages = []
    for node in NODES:
        title, description = catalog[node.href]
        if node.key == 'paila':
            title = 'Paila Pilates'
        name = escape(title, quote=True)
        x, y = node.wide
        cx, cy = node.compact
        radius = 7 + degree[node.key] * 1.1
        if node.key == 'paila':
            radius = 15
        lines = wrap(title, width=14, break_long_words=False)
        label = ''.join(f'<tspan x="0" dy="{0 if index == 0 else 15}">{escape(line)}</tspan>' for index, line in enumerate(lines))
        points.append(f'''<a class="graph-node group-{node.group}" href="{node.href}" aria-label="{name}" data-node="{node.key}" data-name="{name}" data-summary="{escape(description, quote=True)}"
          data-wide="{x} {y}" data-compact="{cx} {cy}" transform="translate({x} {y})">
          <rect class="node-hit" x="-41" y="-22" width="82" height="{52 if len(lines) == 1 else 67}" rx="17"/>
          <circle class="node-ring" r="{radius + 5:.1f}"/><circle class="node-dot" r="{radius:.1f}"/>
          <text class="node-label" text-anchor="middle" y="{radius + 18:.1f}">{label}</text></a>''')
        pages.append((title, f'<li><a href="{node.href}">{name}</a></li>'))

    return f'''<header class="page-intro graph-intro"><h1>Constellation <em>graph.</em></h1>
      <p id="graph-hint" hidden>Pick a node to see its connections. Drag to pan and scroll or pinch to zoom.</p>
      <noscript><p>Open a page on the map or choose one from the page list.</p></noscript></header>
    <section class="graph-layout" aria-label="Explore connected pages">
      <div class="graph-field">
        <div class="graph-toolbar">
          <ul class="graph-legend" aria-label="Page groups"><li class="group-practice">Practice</li><li class="group-studio">Studio</li><li class="group-visit">Visit</li></ul>
          <div class="graph-controls" role="group" aria-label="Graph zoom" hidden>
            <button type="button" id="zoom-out" aria-label="Zoom out" title="Zoom out (−)">−</button>
            <output id="zoom-level" aria-label="Zoom level" aria-live="off">100%</output>
            <button type="button" id="zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button>
            <button type="button" id="graph-fit" title="Fit all pages (0)">Fit</button>
          </div>
        </div>
        <svg id="graph-map" viewBox="0 0 720 350" role="group" aria-label="Page constellation" aria-describedby="graph-keys" tabindex="0">
          <g class="graph-edges" aria-hidden="true">{''.join(links)}</g>
          <g class="graph-nodes">{''.join(points)}</g>
        </svg>
        <p class="graph-keys" id="graph-keys" hidden>Use arrow keys to pan, + and − to zoom, and 0 to fit all pages.</p>
      </div>
      <aside class="graph-detail" aria-labelledby="selected-name">
        <div class="selected-page"><p class="graph-section-label">Selected page</p>
        <h2 id="selected-name" tabindex="-1">Paila Pilates</h2><p id="selected-summary">{escape(catalog['explore.html'][1])}</p>
        <a class="action primary" id="open-node" href="explore.html" aria-label="Open classic menu">Open page</a></div>
        <div class="node-neighbors" hidden><h3 id="neighbors-title">Connected pages</h3><ul id="neighbors"></ul></div>
        <details class="graph-list"><summary>All {len(NODES)} pages</summary>
          <ul>{''.join(entry for _, entry in sorted(pages))}</ul></details>
      </aside>
    </section><p class="sr" id="graph-status" role="status"></p>'''
