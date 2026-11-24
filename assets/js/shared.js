'use strict';
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#navigation');
menu?.addEventListener('click', () => {
  const opened = navigation.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(opened));
  menu.setAttribute('aria-label', opened ? 'Close menu' : 'Open menu');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navigation?.classList.contains('open')) {
    navigation.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.focus();
  }
});
const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

// Continue browsing in the same view after opening one of the studio information pages.
const returnBar = document.querySelector('#return-view');
if (returnBar) {
  const options = [...returnBar.querySelectorAll('a[data-mode]')];
  const ref = document.referrer ? new URL(document.referrer) : null;
  const previous = ref?.origin === location.origin && options.find(link => {
    const view = new URL(link.href);
    return view.pathname === ref.pathname && (!view.searchParams.has('view') ||
      view.searchParams.get('view') === (ref.searchParams.get('view') || 'gallery'));
  });
  let key = previous?.dataset.mode;
  try {
    if (key) sessionStorage.setItem('paila.browsingView', key);
    else key = sessionStorage.getItem('paila.browsingView');
  } catch { /* The referring page works with storage turned off. */ }
  const link = options.find(a => a.dataset.mode === key);
  if (link) {
    if (previous) link.href = ref.href;
    if (link.dataset.mode === 'guide') {
      try { link.hash = sessionStorage.getItem('paila.guideStep') || ''; } catch { /* Start at the first step. */ }
    }
    link.hidden = false;
    returnBar.hidden = false;
  }
}
