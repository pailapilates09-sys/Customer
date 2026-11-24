'use strict';

(() => {
  const map = document.querySelector('#graph-map');
  const nodes = new Map([...map.querySelectorAll('[data-node]')].map(el => [el.dataset.node, el]));
  const edges = [...map.querySelectorAll('[data-from]')];
  const neighbors = new Map([...nodes.keys()].map(key => [key, []]));
  for (const {dataset: {from, to}} of edges) {
    neighbors.get(from).push(to);
    neighbors.get(to).push(from);
  }
  const title = document.querySelector('#selected-name');
  const summary = document.querySelector('#selected-summary');
  const open = document.querySelector('#open-node');
  const related = document.querySelector('#neighbors');
  const status = document.querySelector('#graph-status');
  const percent = document.querySelector('#zoom-level');
  const zoomOut = document.querySelector('#zoom-out');
  const zoomIn = document.querySelector('#zoom-in');
  const maxZoom = 3.5;
  const minZoom = 0.55;
  const limit = (value, low, high) => Math.max(low, Math.min(high, value));
  const world = {wide: [720, 350], compact: [342, 422]};
  const points = new Map();
  const pointers = new Map();
  let layout, width, height, baseScale, x, y;
  let zoom = 1;
  let selected = 'paila';
  let dragged = false;

  function draw() {
    const scale = baseScale * zoom;
    const w = width / scale, h = height / scale;
    const [worldWidth, worldHeight] = world[layout];
    // Keep part of the constellation in reach, even after a long drag.
    const padX = Math.min(worldWidth / 2, w * .18);
    const padY = Math.min(worldHeight / 2, h * .18);
    x = limit(x, padX, worldWidth - padX);
    y = limit(y, padY, worldHeight - padY);
    map.setAttribute('viewBox', [x - w / 2, y - h / 2, w, h].join(' '));
    percent.textContent = Math.round(zoom * 100) + '%';
    zoomOut.disabled = zoom <= minZoom;
    zoomIn.disabled = zoom >= maxZoom;
  }

  function fit() {
    zoom = 1;
    x = world[layout][0] / 2;
    y = world[layout][1] / 2;
    draw();
  }

  function resize() {
    const rect = map.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    const mode = width < 550 ? 'compact' : 'wide';
    baseScale = Math.min(width / world[mode][0], height / world[mode][1]) * .985;
    if (mode === layout) { draw(); return; }
    layout = mode;
    map.classList.toggle('compact', mode === 'compact');
    for (const [key, node] of nodes) {
      const [nx, ny] = node.dataset[mode].split(' ').map(Number);
      points.set(key, {x: nx, y: ny});
      node.setAttribute('transform', 'translate(' + nx + ' ' + ny + ')');
    }
    for (const edge of edges) {
      const a = points.get(edge.dataset.from), b = points.get(edge.dataset.to);
      const bend = mode === 'compact' ? edge.dataset.compactBend : edge.dataset.wideBend;
      edge.setAttribute('d', 'M' + a.x + ' ' + a.y + (bend ? ' Q' + bend + ' ' : ' L') + b.x + ' ' + b.y);
    }
    fit();
  }

  function positionAt(local) {
    const scale = baseScale * zoom;
    return {x: x + (local.x - width / 2) / scale, y: y + (local.y - height / 2) / scale};
  }

  function placeAt(point, local, value) {
    zoom = limit(value, minZoom, maxZoom);
    const scale = baseScale * zoom;
    x = point.x - (local.x - width / 2) / scale;
    y = point.y - (local.y - height / 2) / scale;
    draw();
  }

  function zoomAt(factor, local = {x: width / 2, y: height / 2}) {
    placeAt(positionAt(local), local, zoom * factor);
  }

  function reveal(key) {
    const point = points.get(key);
    const dx = (point.x - x) * baseScale * zoom;
    const dy = (point.y - y) * baseScale * zoom;
    if (Math.abs(dx) > width / 2 - 54 || Math.abs(dy) > height / 2 - 51) {
      x = point.x; y = point.y; draw();
    }
  }

  function trace(key) {
    for (const edge of edges) {
      edge.classList.toggle('lit', edge.dataset.from === key || edge.dataset.to === key);
    }
    for (const [id, node] of nodes) {
      node.classList.toggle('traced', id === key);
      node.classList.toggle('neighbor', neighbors.get(key).includes(id));
    }
  }

  function select(key, record = true) {
    const node = nodes.get(key);
    selected = key;
    for (const [id, el] of nodes) {
      el.classList.toggle('selected', id === key);
      el.setAttribute('aria-pressed', String(id === key));
    }
    title.textContent = node.dataset.name;
    summary.textContent = node.dataset.summary;
    open.href = node.getAttribute('href');
    open.setAttribute('aria-label', key === 'paila' ? 'Open classic menu' : 'Open ' + node.dataset.name.toLowerCase());
    const entries = neighbors.get(key);
    related.replaceChildren(...entries.map(id => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.select = id;
      button.textContent = nodes.get(id).dataset.name;
      li.append(button);
      return li;
    }));
    trace(key);
    if (record) {
      reveal(key);
      const url = new URL(location.href);
      url.searchParams.set('node', key);
      history.replaceState(history.state, '', url);
      status.textContent = node.dataset.name + ' selected. ' + entries.length + ' connected pages.';
    }
  }

  related.addEventListener('click', event => {
    const button = event.target.closest('[data-select]');
    if (!button) return;
    select(button.dataset.select);
    if (event.detail === 0) title.focus({preventScroll: true});
  });
  for (const node of nodes.values()) node.setAttribute('role', 'button');
  map.addEventListener('click', event => {
    const node = event.target.closest('[data-node]');
    if (!node || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (event.detail === 0 || !dragged) select(node.dataset.node);
  });
  map.addEventListener('pointerover', event => {
    const node = event.target.closest('[data-node]');
    if (node && event.pointerType === 'mouse' && !pointers.size) trace(node.dataset.node);
  });
  map.addEventListener('pointerout', event => {
    if (event.target.closest('[data-node]') && event.pointerType === 'mouse' && !pointers.size) trace(selected);
  });
  map.addEventListener('focusin', event => {
    const node = event.target.closest('[data-node]');
    if (node && node.matches(':focus-visible')) { reveal(node.dataset.node); trace(node.dataset.node); }
  });
  map.addEventListener('focusout', () => trace(selected));

  function localPoint(event) {
    const rect = map.getBoundingClientRect();
    return {x: event.clientX - rect.left, y: event.clientY - rect.top};
  }
  function midpoint(a, b) {return {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};}
  function distance(a, b) {return Math.hypot(a.x - b.x, a.y - b.y);}

  map.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    const point = localPoint(event);
    if (!pointers.size) dragged = false;
    else dragged = true;
    pointers.set(event.pointerId, {point, start: point});
    event.target.setPointerCapture(event.pointerId);
  });
  map.addEventListener('pointermove', event => {
    const active = pointers.get(event.pointerId);
    if (!active) return;
    const next = localPoint(event);
    if (pointers.size === 2) {
      const other = [...pointers.values()].find(p => p !== active).point;
      const oldMid = midpoint(active.point, other), newMid = midpoint(next, other);
      const ratio = distance(next, other) / Math.max(1, distance(active.point, other));
      placeAt(positionAt(oldMid), newMid, zoom * ratio);
    } else {
      if (!dragged && distance(next, active.start) < 5) return;
      dragged = true;
      x -= (next.x - active.point.x) / (baseScale * zoom);
      y -= (next.y - active.point.y) / (baseScale * zoom);
      draw();
    }
    active.point = next;
    map.classList.add('dragging');
  });
  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (!pointers.size) map.classList.remove('dragging');
  }
  map.addEventListener('pointerup', endPointer);
  map.addEventListener('pointercancel', endPointer);
  map.addEventListener('lostpointercapture', endPointer);
  map.addEventListener('dragstart', event => event.preventDefault());
  map.addEventListener('wheel', event => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    zoomAt(Math.exp(-limit(event.deltaY * unit, -350, 350) * .0025), localPoint(event));
  }, {passive: false});
  map.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const step = (event.shiftKey ? 110 : 48) / (baseScale * zoom);
    switch (event.key) {
      case '+': case '=': zoomAt(1.3); break;
      case '-': case '_': zoomAt(1 / 1.3); break;
      case '0': fit(); break;
      case 'ArrowRight': x += step; draw(); break;
      case 'ArrowLeft': x -= step; draw(); break;
      case 'ArrowDown': y += step; draw(); break;
      case 'ArrowUp': y -= step; draw(); break;
      case ' ': {
        const node = event.target.closest('[data-node]');
        if (!node) return;
        select(node.dataset.node); break;
      }
      default: return;
    }
    event.preventDefault();
  });
  zoomIn.addEventListener('click', () => zoomAt(1.3));
  zoomOut.addEventListener('click', () => zoomAt(1 / 1.3));
  document.querySelector('#graph-fit').addEventListener('click', fit);

  document.querySelector('.graph-controls').hidden = false;
  document.querySelector('.node-neighbors').hidden = false;
  document.querySelector('#graph-hint').hidden = false;
  document.querySelector('#graph-keys').hidden = false;
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(map);
  else window.addEventListener('resize', resize);
  const requested = new URLSearchParams(location.search).get('node');
  select(nodes.has(requested) ? requested : 'paila', false);
  // A normal Back, or the information page's return link, keeps the visitor's place.
  const storageKey = 'paila.constellationCamera';
  try {
    const saved = history.state?.constellation || (requested && JSON.parse(sessionStorage.getItem(storageKey)));
    if (saved && saved.key === selected && saved.layout === layout &&
        [saved.x, saved.y, saved.zoom].every(Number.isFinite)) {
      x = saved.x; y = saved.y; zoom = limit(saved.zoom, minZoom, maxZoom); draw();
    }
  } catch { /* Navigation also works with storage disabled. */ }
  function remember() {
    const camera = {key: selected, layout, x, y, zoom};
    try { history.replaceState({...history.state, constellation: camera}, ''); } catch { /* Page may be unloading. */ }
    try { sessionStorage.setItem(storageKey, JSON.stringify(camera)); } catch { /* Storage is optional. */ }
  }
  open.addEventListener('click', () => {
    // Include the active node in the same-origin referrer used by the return link.
    if (!new URLSearchParams(location.search).has('node')) select(selected);
    remember();
  });
  window.addEventListener('pagehide', remember);
})();
