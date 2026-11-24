'use strict';

function enableChooser(picker) {
  const select = picker.querySelector('select');
  const open = picker.querySelector('a');
  const modes = new Map([...document.querySelectorAll('a[data-mode]')].map(a => [a.dataset.mode, a]));
  const storageKey = 'paila.preferredView';
  function remember(key) {
    try { localStorage.setItem(storageKey, key); } catch { /* The chooser also works without storage. */ }
    try { sessionStorage.setItem('paila.browsingView', key); } catch { /* Direct links still work. */ }
  }
  function sync() { open.href = modes.get(select.value).href; }

  try {
    const saved = localStorage.getItem(storageKey);
    if (modes.has(saved)) select.value = saved;
  } catch { /* Keep the default view. */ }
  sync();
  picker.hidden = false;
  select.addEventListener('change', sync);
  open.addEventListener('click', () => remember(select.value));
  modes.forEach((a, key) => a.addEventListener('click', () => {
    remember(key);
    select.value = key;
    sync();
  }));
  window.addEventListener('pageshow', sync);
}

function enableDirectory(form) {
  const input = form.querySelector('input');
  const clear = form.querySelector('button');
  const status = document.querySelector('#result-count');
  const entries = [...document.querySelectorAll('#topic-list li')].map(row => ({
    row,
    text: (row.textContent + ' ' + row.dataset.keywords).toLowerCase()
  }));
  function filter() {
    const query = input.value.trim();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const {row, text} of entries) {
      row.hidden = !words.every(word => text.includes(word));
      if (!row.hidden) count++;
    }
    clear.hidden = !query;
    status.textContent = count ? count + (count === 1 ? ' page' : ' pages') :
      'No pages match “' + query + '”. Try “class”, “map” or “price”.';
  }
  function update() {
    filter();
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    if (url.href !== location.href) history.replaceState(null, '', url);
  }
  function restore() {
    input.value = new URLSearchParams(location.search).get('q') || '';
    filter();
  }
  form.hidden = false;
  restore();
  input.addEventListener('input', update);
  form.addEventListener('submit', event => { event.preventDefault(); update(); });
  clear.addEventListener('click', () => {
    input.value = '';
    update();
    input.focus();
  });
  window.addEventListener('pageshow', restore);
}

function enableGuide(nav) {
  const tabs = [...nav.querySelectorAll('a')];
  const panels = [...document.querySelectorAll('.step-panel')];
  function show(focus) {
    const target = panels.find(panel => '#' + panel.id === location.hash);
    if (focus && location.hash && !target) return;
    const selected = target || panels[0];
    panels.forEach(panel => { panel.hidden = panel !== selected; });
    tabs.forEach(tab => {
      if (tab.hash === '#' + selected.id) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    });
    if (focus) {
      const heading = selected.querySelector('h2');
      heading.focus({preventScroll: true});
      const box = heading.getBoundingClientRect();
      if (box.top < 0 || box.bottom > innerHeight) heading.scrollIntoView({block: 'center', behavior: 'instant'});
    }
    try { sessionStorage.setItem('paila.guideStep', selected.id); } catch { /* Steps are also deep links. */ }
  }
  show(false);
  window.addEventListener('hashchange', () => show(true));
  window.addEventListener('pageshow', () => show(false));
}

const picker = document.querySelector('#quick-choice');
const search = document.querySelector('#directory-search');
const steps = document.querySelector('.step-nav');
if (picker) enableChooser(picker);
if (search) enableDirectory(search);
if (steps) enableGuide(steps);
