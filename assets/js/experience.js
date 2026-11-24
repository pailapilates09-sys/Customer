'use strict';

(() => {
  const page = document.querySelector('.experience-page');
  const stage = document.querySelector('#gallery-stage');
  const rail = document.querySelector('#rail-track');
  if (!page || !stage || !rail) return;

  const items = [
    { title: 'The studio', kicker: 'Room to move', copy: 'Walk from reception into the reformer room in the studio design.', href: 'studio/walkthrough/', action: 'Walk through the studio' },
    { title: 'Classes', kicker: 'Make space for movement', copy: 'See where class information will live. Times and class details are still awaiting approval.', href: 'schedule.html', action: 'View class information' },
    { title: 'Passes', kicker: 'Find your rhythm', copy: 'Find the place for Paila passes. Prices and terms will appear after approval.', href: 'passes.html', action: 'Explore passes' },
    { title: 'Our people', kicker: 'Meet the team', copy: 'Meet the people behind Paila when instructor profiles and photos are approved.', href: 'instructors.html', action: 'Meet the team' },
    { title: 'About Paila', kicker: 'Move with intention', copy: 'Visit the Paila introduction and see what is being prepared for the studio.', href: 'about.html', action: 'About Paila' },
    { title: 'Find us', kicker: 'Your way here', copy: 'Use the Paila location pin to plan your visit. The written address and opening hours are still pending.', href: 'directions.html', action: 'Get directions' }
  ];
  const cards = [...stage.querySelectorAll('.gallery-card')];
  const tabs = [...document.querySelectorAll('[data-view]')];
  const dotBox = document.querySelector('#selection-dots');
  const dialog = document.querySelector('#section-dialog');
  const hint = document.querySelector('#gesture-hint');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px)');
  let selected = 0;
  let view = 'gallery';
  let drag = null;
  let ignoreClickUntil = 0;
  let railFrame = 0;

  const wrap = n => ((n % items.length) + items.length) % items.length;
  function signedDistance(n) {
    return ((n + items.length * 1.5) % items.length) - items.length / 2;
  }

  const railItems = cards.map((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rail-item';
    button.style.cssText = card.style.cssText;
    button.style.setProperty('--lean', (index < selected ? '-57deg' : '57deg'));
    button.dataset.index = String(index);
    button.setAttribute('aria-label', 'Select ' + items[index].title);
    button.setAttribute('aria-pressed', String(index === selected));
    const hanger = document.createElement('span');
    hanger.className = 'rail-hanger';
    hanger.setAttribute('aria-hidden', 'true');
    const tile = document.createElement('span');
    tile.className = 'rail-tile';
    tile.append(card.querySelector('.card-art').cloneNode(true));
    const label = document.createElement('span');
    label.className = 'rail-title';
    label.textContent = items[index].title;
    tile.append(label);
    button.append(hanger, tile);
    button.addEventListener('click', () => choose(index));
    rail.append(button);
    return button;
  });

  const dots = items.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Select ' + item.title);
    button.setAttribute('aria-pressed', String(index === selected));
    button.addEventListener('click', () => choose(index));
    dotBox.append(button);
    return button;
  });

  function drawGallery(offset = 0) {
    const radius = Math.min(stage.clientWidth * (mobile.matches ? .64 : .47), 640);
    cards.forEach((card, index) => {
      const distance = signedDistance(index - selected + offset);
      const angle = distance * .62;
      const x = Math.sin(angle) * radius;
      const z = (Math.cos(angle) - 1) * 290;
      const y = Math.abs(Math.sin(angle)) * 30;
      const isHidden = Math.abs(distance) > 2.55;
      card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${-angle * 180 / Math.PI}deg)`;
      card.style.opacity = String(Math.max(.45, 1 - Math.abs(distance) * .12));
      card.style.zIndex = String(20 - Math.round(Math.abs(distance) * 4));
      card.dataset.current = String(index === selected);
      card.dataset.hidden = String(isHidden);
      card.tabIndex = isHidden && !reduced.matches ? -1 : 0;
    });
  }

  function centerRail() {
    if (!mobile.matches || view !== 'rail') return;
    const card = railItems[selected];
    rail.scrollTo({left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: reduced.matches ? 'instant' : 'smooth'});
  }

  function choose(index, {scrollRail = true} = {}) {
    selected = wrap(index);
    const item = items[selected];
    document.querySelector('#selected-kicker').textContent = item.kicker;
    document.querySelector('#selected-title').textContent = item.title;
    document.querySelector('#selected-copy').textContent = item.copy;
    const link = document.querySelector('#selected-link');
    link.href = item.href;
    link.textContent = item.action;
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === selected)));
    railItems.forEach((button, i) => {
      button.classList.toggle('is-selected', i === selected);
      button.setAttribute('aria-pressed', String(i === selected));
      button.style.setProperty('--lean', (i < selected ? '-57deg' : '57deg'));
    });
    drawGallery();
    if (scrollRail) centerRail();
  }

  function showDetails(index) {
    choose(index, {scrollRail:false});
    const item = items[index];
    if (typeof dialog.showModal !== 'function') {
      document.querySelector('#selected-link').focus();
      return;
    }
    const art = document.querySelector('#dialog-art');
    art.style.setProperty('--card-bg', cards[index].style.getPropertyValue('--card-bg'));
    art.style.setProperty('--card-ink', cards[index].style.getPropertyValue('--card-ink'));
    art.replaceChildren(cards[index].querySelector('svg').cloneNode(true));
    document.querySelector('#dialog-kicker').textContent = item.kicker;
    document.querySelector('#dialog-title').textContent = item.title;
    document.querySelector('#dialog-copy').textContent = item.copy;
    const link = document.querySelector('#dialog-link');
    link.textContent = item.action;
    link.href = item.href;
    if (!dialog.open) dialog.showModal();
  }

  function requestedView() {
    return new URLSearchParams(location.search).get('view') === 'rail' ? 'rail' : 'gallery';
  }

  function setView(next, updateHistory = false) {
    if (updateHistory && next !== view) {
      const url = new URL(location.href);
      url.searchParams.set('view', next);
      history.pushState(null, '', url);
    }
    view = next;
    tabs.forEach(tab => {
      const active = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.querySelector('#' + tab.getAttribute('aria-controls')).hidden = !active;
    });
    hint.textContent = reduced.matches ? 'Choose a section or use Previous and Next' : (view === 'gallery' ? 'Drag to explore · Pick a card to look closer' : 'Pick a card · Swipe the rail on your phone');
    if (view === 'gallery') drawGallery();
    else centerRail();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setView(tab.dataset.view, true));
    tab.addEventListener('keydown', event => {
      const key = event.key;
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(key)) return;
      event.preventDefault();
      const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setView(tabs[next].dataset.view, true);
      tabs[next].focus();
    });
  });

  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      if (performance.now() < ignoreClickUntil) return;
      showDetails(index);
    });
    card.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      choose(selected + (event.key === 'ArrowRight' ? 1 : -1));
      cards[selected].focus({preventScroll:true});
    });
  });
  document.querySelector('#previous').addEventListener('click', () => choose(selected - 1));
  document.querySelector('#next').addEventListener('click', () => choose(selected + 1));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => cards[selected].focus({preventScroll:true}));

  stage.addEventListener('pointerdown', event => {
    if (reduced.matches || event.button !== 0) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,active:false};
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active && Math.abs(dy) > Math.max(10, Math.abs(dx))) {drag = null;return;}
    if (!drag.active && Math.abs(dx) > 8) {
      drag.active = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
    }
    if (!drag.active) return;
    drag.dx = dx;
    drawGallery(Math.max(-1.5, Math.min(1.5, dx / (mobile.matches ? 140 : 210))));
  });
  function endDrag(event, cancel = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const completed = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (completed.active) {
      ignoreClickUntil = performance.now() + 350;
      choose(!cancel && Math.abs(completed.dx) > 38 ? selected - Math.sign(completed.dx) : selected);
    } else drawGallery();
  }
  stage.addEventListener('pointerup', event => endDrag(event));
  stage.addEventListener('pointercancel', event => endDrag(event,true));
  stage.addEventListener('lostpointercapture', event => endDrag(event,true));
  stage.addEventListener('dragstart', event => event.preventDefault());

  rail.addEventListener('scroll', () => {
    if (!mobile.matches || view !== 'rail') return;
    cancelAnimationFrame(railFrame);
    railFrame = requestAnimationFrame(() => {
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let nearest = 0, distance = Infinity;
      railItems.forEach((item,index) => {
        const d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center);
        if (d < distance) {nearest=index;distance=d;}
      });
      if (nearest !== selected) choose(nearest, {scrollRail:false});
    });
  }, {passive:true});

  addEventListener('resize', () => {drawGallery();centerRail();});
  addEventListener('popstate', () => setView(requestedView()));
  reduced.addEventListener('change', () => {drawGallery();setView(view);});
  page.classList.add('motion-ready');
  choose(0);
  setView(requestedView());
})();
