const $ = (selector) => document.querySelector(selector);
const canvas = $('#film');
const context = canvas.getContext('2d', {alpha: true});
const scene = $('.scene');
const tour = $('.journey');
const viewport = $('.viewport');
const controls = $('.controls');
const range = $('#progress');
const motion = $('#motion');
const hotspot = $('#hotspot');
const guide = $('#guide');
const touchLayout = matchMedia('(max-width: 700px) and (orientation: portrait)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const rooms = [
  {id: 'entrance', name: 'Entrance', copy: 'Step through the glazed entrance and follow the curve of the reception desk.'},
  {id: 'reception', name: 'Reception', copy: 'Pass the curved counter and the ring lights above it. The lounge opens to the left.'},
  {id: 'lounge', name: 'Lounge', copy: 'Pass the coffee shelves and seating, then follow the glass partition toward the studio.'},
  {id: 'reformer', name: 'Reformer room', copy: 'Tap a reformer to meet the equipment and read the first-class guide.'}
];
const stopButtons = [...document.querySelectorAll('[data-stop]')];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let route, variant, still = false, frame = 0, painted = -1, activeRoom = -1;
let walkBeforeStills = 0;
let animation = 0, lastDirection = 1, bounds, fit, opener, lastScroll = 0, maskPixels;
let missingFrames = false;
const sheets = new Map();

function frameRoom(value) {
  return route.enters.reduce((room, start, i) => value >= start ? i : room, 0);
}

function loadImage(src) {
  const image = new Image();
  image.decoding = 'async';
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(src));
    image.src = src;
  });
}

function setPoster(room) {
  const name = rooms[room].id;
  if ($('.poster').dataset.room === name) return;
  $('.poster').dataset.room = name;
  $('.poster source').srcset = 'media/touch-' + name + '.webp';
  $('#poster').src = 'media/wide-' + name + '.webp';
  $('#poster').alt = rooms[room].name + ' in the Paila Pilates studio design.';
}

function displayRoom(room) {
  if (room === activeRoom) return;
  activeRoom = room;
  const entry = rooms[room];
  $('#poster').alt = entry.name + ' in the Paila Pilates studio design.';
  $('#room-name').textContent = entry.name;
  $('#room-copy').textContent = entry.copy;
  stopButtons.forEach((btn, i) => {
    if (i === room) btn.setAttribute('aria-current', 'location');
    else btn.removeAttribute('aria-current');
  });
  $('#next-stop').hidden = room === rooms.length - 1;
  $('#guide-button').hidden = room !== rooms.length - 1;
  $('#announce').textContent = entry.name;
}

function resize() {
  bounds = scene.getBoundingClientRect();
  const p = route.views[variant];
  const scale = Math.max(bounds.width / p.width, bounds.height / p.height);
  fit = {
    w: p.width * scale, h: p.height * scale,
    x: (bounds.width - p.width * scale) / 2,
    y: (bounds.height - p.height * scale) * .52
  };
  const density = Math.min(window.devicePixelRatio || 1, 1.65);
  canvas.width = Math.max(1, Math.round(bounds.width * density));
  canvas.height = Math.max(1, Math.round(bounds.height * density));
  context.setTransform(canvas.width / Math.max(1, bounds.width), 0, 0, canvas.height / Math.max(1, bounds.height), 0, 0);
  painted = -1;
  queuePaint();
}

function placeHotspot() {
  hotspot.hidden = true;
  if (painted < route.firstHit || !fit) return;
  const candidates = route.views[variant].anchors[painted - route.firstHit] || [];
  const captionTop = $('.room-caption').getBoundingClientRect().top - bounds.top;
  for (const [u, v] of candidates) {
    const x = fit.x + fit.w * u, y = fit.y + fit.h * v;
    if (x < 42 || x > bounds.width - 42 || y < 78 || y > Math.min(bounds.height - 34, captionTop - 12)) continue;
    hotspot.style.left = x + 'px';
    hotspot.style.top = y + 'px';
    hotspot.hidden = false;
    break;
  }
}

async function loadMask(kind) {
  maskPixels = null;
  try {
    const img = await loadImage('media/' + kind + '-hit.png');
    if (kind !== variant) return;
    const mask = document.createElement('canvas');
    mask.width = img.width; mask.height = img.height;
    const ctx = mask.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(img, 0, 0);
    maskPixels = ctx.getImageData(0, 0, mask.width, mask.height);
  } catch { /* The labelled hotspot and guide button also open the guide. */ }
}

function sheet(index, current) {
  if (index < 0 || index > Math.floor(route.last / route.perSheet)) return null;
  let entry = sheets.get(index);
  if (entry) return entry;
  const kind = variant;
  entry = {image: null, failed: false};
  sheets.set(index, entry);
  loadImage('media/' + kind + '-' + String(index).padStart(2, '0') + '.webp').then((image) => {
    if (kind !== variant || sheets.get(index) !== entry) return;
    entry.image = image;
    if (Math.floor(frame / route.perSheet) === index && !still) queuePaint();
  }).catch(() => {
    if (kind !== variant || sheets.get(index) !== entry) return;
    entry.failed = true;
    if (Math.floor(frame / route.perSheet) === index && !still) switchToPhotos();
  });
  for (const key of sheets.keys()) {
    if (Math.abs(key - current) > 1) sheets.delete(key);
  }
  return entry;
}

function switchToPhotos() {
  missingFrames = true;
  changeMotion(true);
  $('#hint-text').textContent = 'Choose a room below';
}

function paint() {
  animation = 0;
  if (!fit) return;
  const room = frameRoom(frame);
  if (!still) {
    const reverse = frame === route.last;
    const hint = touchLayout.matches ? (reverse ? 'Swipe down to return' : 'Swipe up to walk') : (reverse ? 'Scroll back to return' : 'Scroll to walk');
    if ($('#hint-text').textContent !== hint) $('#hint-text').textContent = hint;
  }
  displayRoom(room);
  range.value = String(still ? room : frame);
  range.setAttribute('aria-valuetext', rooms[room].name + (still ? '' : ' · ' + Math.round(frame / route.last * 100) + '%'));
  if (still) {
    context.clearRect(0, 0, bounds.width, bounds.height);
    painted = route.stops[room];
    placeHotspot();
    return;
  }
  const current = Math.floor(frame / route.perSheet);
  const entry = sheet(current, current);
  if (entry.failed) return switchToPhotos();
  if (!entry.image) {
    hotspot.hidden = true;
    if (painted < 0 || frameRoom(painted) !== room) {
      setPoster(room);
      context.clearRect(0, 0, bounds.width, bounds.height);
      painted = -1;
    }
    return;
  }
  if (painted !== frame) {
    const tile = frame % route.perSheet;
    const p = route.views[variant];
    context.drawImage(entry.image, tile % route.columns * p.width, Math.floor(tile / route.columns) * p.height,
      p.width, p.height, fit.x, fit.y, fit.w, fit.h);
    painted = frame;
  }
  placeHotspot();
  sheet(current + lastDirection, current);
}

function queuePaint() {
  if (!animation) animation = requestAnimationFrame(paint);
}

function setFrame(value) {
  const next = clamp(Math.round(value), 0, route.last);
  if (next !== frame) lastDirection = Math.sign(next - frame);
  frame = next;
  queuePaint();
}

function travel() {
  return Math.max(1, tour.offsetHeight - viewport.offsetHeight);
}

function readScroll() {
  if (!still && !guide.open) setFrame(window.scrollY / travel() * route.last);
}

function goTo(value) {
  setFrame(value);
  if (still) setPoster(frameRoom(frame));
  else window.scrollTo({top: frame / route.last * travel(), behavior: 'instant'});
}

function changeMotion(value) {
  if (value) walkBeforeStills = frame;
  still = value;
  document.body.classList.toggle('still', still);
  motion.setAttribute('aria-pressed', String(still));
  range.max = String(still ? rooms.length - 1 : route.last);
  $('#hint-text').textContent = still ? 'Choose a room below' : (touchLayout.matches ? 'Swipe up to walk' : 'Scroll to walk');
  if (still) {
    frame = route.stops[frameRoom(walkBeforeStills)];
    setPoster(frameRoom(frame));
    window.scrollTo({top: 0, behavior: 'instant'});
  } else {
    if (frameRoom(walkBeforeStills) === frameRoom(frame)) frame = walkBeforeStills;
    window.scrollTo({top: frame / route.last * travel(), behavior: 'instant'});
  }
  painted = -1;
  resize();
}

function setLayout() {
  variant = touchLayout.matches ? 'touch' : 'wide';
  sheets.clear();
  if (still) setPoster(frameRoom(frame));
  $('#hint-text').textContent = still ? 'Choose a room below' : (touchLayout.matches ? 'Swipe up to walk' : 'Scroll to walk');
  loadMask(variant);
  resize();
}

function openGuide(source) {
  if (guide.open) return;
  opener = source;
  lastScroll = window.scrollY;
  document.documentElement.classList.add('guide-open');
  guide.showModal();
  $('#close-guide').focus({preventScroll: true});
}

function hitReformer(clientX, clientY) {
  if (!maskPixels || painted < route.firstHit || !fit) return false;
  const box = scene.getBoundingClientRect(), p = route.views[variant];
  const u = (clientX - box.left - fit.x) / fit.w, v = (clientY - box.top - fit.y) / fit.h;
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
  const tile = painted - route.firstHit;
  const x = (tile % route.maskColumns) * p.maskWidth + Math.floor(u * p.maskWidth);
  const y = Math.floor(tile / route.maskColumns) * p.maskHeight + Math.floor(v * p.maskHeight);
  return maskPixels.data[(y * maskPixels.width + x) * 4] > 127;
}

function attachControls() {
  stopButtons.forEach((btn, i) => btn.addEventListener('click', () => goTo(route.stops[i])));
  $('#next-stop').addEventListener('click', () => goTo(route.stops[Math.min(3, frameRoom(frame) + 1)]));
  range.addEventListener('input', () => goTo(still ? route.stops[Number(range.value)] : Number(range.value)));
  motion.addEventListener('click', () => {
    if (missingFrames && still) {missingFrames = false; sheets.clear();}
    changeMotion(!still);
  });
  window.addEventListener('scroll', readScroll, {passive: true});
  new ResizeObserver(resize).observe(scene);
  touchLayout.addEventListener('change', setLayout);
  reducedMotion.addEventListener('change', (event) => changeMotion(event.matches));
  window.addEventListener('pageshow', () => {
    if (!still) readScroll();
  });
  document.addEventListener('keydown', (event) => {
    if (guide.open || event.target.closest('button,a,input') || event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[event.key];
    if (!direction) return;
    event.preventDefault();
    goTo(still ? route.stops[clamp(frameRoom(frame) + direction, 0, 3)] : frame + direction * 3);
  });
  let drag;
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = {x: event.clientX, y: event.clientY, frame, moved: false};
    if (event.pointerType === 'mouse') canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!event.isPrimary) return;
    canvas.style.cursor = hitReformer(event.clientX, event.clientY) ? 'pointer' : (drag && !still ? 'grabbing' : '');
    if (!drag) return;
    const dy = drag.y - event.clientY;
    if (Math.hypot(event.clientX - drag.x, dy) > 6) drag.moved = true;
    if (drag.moved && !still && event.pointerType === 'mouse') goTo(drag.frame + dy * .21);
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerup', (event) => {
    if (!drag || !event.isPrimary) return;
    const tapped = !drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 10;
    drag = null;
    if (tapped && hitReformer(event.clientX, event.clientY)) openGuide($('#guide-button'));
  });
  hotspot.addEventListener('click', () => openGuide(hotspot));
  $('#guide-button').addEventListener('click', () => openGuide($('#guide-button')));
  $('#close-guide').addEventListener('click', () => guide.close());
  $('#resume').addEventListener('click', () => guide.close());
  guide.addEventListener('click', (event) => {
    if (event.target !== guide) return;
    const r = guide.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) guide.close();
  });
  guide.addEventListener('close', () => {
    document.documentElement.classList.remove('guide-open');
    window.scrollTo({top: lastScroll, behavior: 'instant'});
    (opener?.hidden ? $('#guide-button') : opener)?.focus({preventScroll: true});
  });
}

async function start() {
  if (!context || typeof guide.showModal !== 'function') return;
  const response = await fetch(new URL('route.json', import.meta.url));
  if (!response.ok) return;
  route = await response.json();
  variant = touchLayout.matches ? 'touch' : 'wide';
  controls.hidden = false;
  motion.hidden = false;
  $('#hint').hidden = false;
  $('#static-tour').hidden = true;
  document.body.classList.add('ready');
  attachControls();
  if (reducedMotion.matches) changeMotion(true);
  else readScroll();
  setLayout();
}

start().catch(() => {
  document.body.classList.remove('ready', 'still');
  controls.hidden = true;
  motion.hidden = true;
  $('#static-tour').hidden = false;
});
