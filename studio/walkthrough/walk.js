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
const poster = $('#poster');
const picture = $('.poster');
const caption = $('.room-caption');
const roomLink = $('#room-link');
const hintText = $('#hint-text');
const touchLayout = matchMedia('(max-width: 700px) and (orientation: portrait)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const rooms = [
  {id: 'entrance', link: '../../directions.html', action: 'Get directions', name: 'Entrance', copy: 'Step through the glazed entrance and follow the curve of the reception desk.'},
  {id: 'reception', link: '../../passes.html', action: 'Explore passes', name: 'Reception', copy: 'Pass the curved counter and the ring lights above it. The lounge opens to the left.'},
  {id: 'lounge', link: '../../instructors.html', action: 'Meet the team', name: 'Lounge', copy: 'Pass the coffee shelves and seating, then follow the glass partition toward the studio.'},
  {id: 'reformer', link: '../../schedule.html', action: 'Class information', name: 'Reformer room', copy: 'Tap a reformer to meet the equipment and read the first-class guide.'}
];
const stopButtons = [...document.querySelectorAll('[data-stop]')];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let route, variant, still = false, frame = 0, painted = -1, activeRoom = -1;
let walkBeforeStills = 0;
let animation = 0, lastDirection = 1, bounds, fit, maskPixels;
let guideReturn = null;
let missingFrames = false;
const motionSheets = new Map();
const detailSheets = new Map();
const motionSize = {wide: [448, 280], touch: [288, 353]};
const motionPerSheet = 12;
const motionColumns = 4;
const connection = navigator.connection;
const conserveData = connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || '');
let paintedLayer = '', requestedMask = '', detailFrame = -1, detailTimer = 0;
let captionLimit = 0, travelDistance = 1;

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
  if (picture.dataset.room === name) return;
  picture.dataset.room = name;
  $('.poster source').srcset = 'media/touch-' + name + '.webp';
  poster.src = 'media/wide-' + name + '.webp';
  poster.alt = rooms[room].name + ' in the Paila Pilates studio design.';
}

function displayRoom(room) {
  if (room === activeRoom) return;
  activeRoom = room;
  const entry = rooms[room];
  poster.alt = entry.name + ' in the Paila Pilates studio design.';
  $('#room-name').textContent = entry.name;
  $('#room-copy').textContent = entry.copy;
  roomLink.href = entry.link;
  roomLink.textContent = entry.action;
  stopButtons.forEach((btn, i) => {
    if (i === room) btn.setAttribute('aria-current', 'location');
    else btn.removeAttribute('aria-current');
  });
  $('#next-stop').hidden = room === rooms.length - 1;
  $('#guide-button').hidden = room !== rooms.length - 1;
  $('#announce').textContent = entry.name;
}

function measureCaption() {
  if (!bounds) return;
  captionLimit = caption.getBoundingClientRect().top - scene.getBoundingClientRect().top;
  if (painted >= route.firstHit) placeHotspot();
}

function resize() {
  const box = scene.getBoundingClientRect();
  travelDistance = Math.max(1, tour.offsetHeight - viewport.offsetHeight);
  const p = route.views[variant];
  const scale = Math.max(box.width / p.width, box.height / p.height);
  // More backing pixels than the source can supply only increase the GPU upload.
  const density = Math.min(window.devicePixelRatio || 1, 1 / scale);
  const w = Math.max(1, Math.round(box.width * density));
  const h = Math.max(1, Math.round(box.height * density));
  if (fit && bounds.width === box.width && bounds.height === box.height && canvas.width === w && canvas.height === h) return;
  bounds = box;
  fit = {w: p.width * scale, h: p.height * scale,
    x: (box.width - p.width * scale) / 2, y: (box.height - p.height * scale) * .52};
  canvas.width = w;
  canvas.height = h;
  context.setTransform(w / Math.max(1, box.width), 0, 0, h / Math.max(1, box.height), 0, 0);
  painted = -1;
  paintedLayer = '';
  measureCaption();
  queuePaint();
}

function placeHotspot() {
  if (painted < route.firstHit || !fit) {
    hotspot.hidden = true;
    return;
  }
  const candidates = route.views[variant].anchors[painted - route.firstHit] || [];
  for (const [u, v] of candidates) {
    const x = fit.x + fit.w * u, y = fit.y + fit.h * v;
    if (x < 42 || x > bounds.width - 42 || y < 78 || y > Math.min(bounds.height - 34, captionLimit - 12)) continue;
    hotspot.style.left = x + 'px';
    hotspot.style.top = y + 'px';
    hotspot.hidden = false;
    return;
  }
  hotspot.hidden = true;
}

async function loadMask(kind) {
  if (requestedMask === kind) return;
  requestedMask = kind;
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

// Keep nearby motion sheets and the most recent detail sheet. Cancelling a stale
// request matters when someone jumps straight across several rooms with the slider.
function trim(cache, center, radius) {
  for (const [index, entry] of cache) {
    if (Math.abs(index - center) <= radius) continue;
    cache.delete(index);
    if (!entry.ready && !entry.failed) {
      entry.image.onload = entry.image.onerror = null;
      entry.image.removeAttribute('src');
    }
  }
}

function sheet(index, detail, priority) {
  const perSheet = detail ? route.perSheet : motionPerSheet;
  if (index < 0 || index > Math.floor(route.last / perSheet)) return null;
  const cache = detail ? detailSheets : motionSheets;
  const cached = cache.get(index);
  if (cached) {
    if (priority === 'high' && !cached.ready) cached.image.fetchPriority = 'high';
    return cached;
  }
  const image = new Image();
  const entry = {image, ready: false, failed: false};
  cache.set(index, entry);
  image.decoding = 'async';
  image.fetchPriority = priority;
  const settle = (ready) => {
    if (cache.get(index) !== entry) return;
    entry.ready = ready;
    entry.failed = !ready;
    if (!still && Math.floor(frame / perSheet) === index) queuePaint();
  };
  image.onload = async () => {
    try {
      if (image.decode) await image.decode();
      settle(true);
    } catch { settle(false); }
  };
  image.onerror = () => settle(false);
  image.src = 'media/' + variant + (detail ? '-' : '-motion-v1-') + String(index).padStart(2, '0') + '.webp';
  return entry;
}

function switchToPhotos() {
  missingFrames = true;
  changeMotion(true);
}

function drawSheet(entry, which, detail) {
  const layer = detail ? 'detail' : 'motion';
  if (painted === which && paintedLayer === layer) return;
  const p = route.views[variant];
  const [w, h] = detail ? [p.width, p.height] : motionSize[variant];
  const columns = detail ? route.columns : motionColumns;
  const tile = which % (detail ? route.perSheet : motionPerSheet);
  context.drawImage(entry.image, tile % columns * w, Math.floor(tile / columns) * h,
    w, h, fit.x, fit.y, fit.w, fit.h);
  painted = which;
  paintedLayer = layer;
  placeHotspot();
}

function showPoster(room) {
  setPoster(room);
  const expected = variant + '-' + rooms[room].id + '.webp';
  if (!poster.complete || !poster.naturalWidth || !poster.currentSrc.endsWith('/' + expected)) return false;
  if (paintedLayer !== 'poster') context.clearRect(0, 0, bounds.width, bounds.height);
  painted = route.stops[room];
  paintedLayer = 'poster';
  placeHotspot();
  return true;
}

function paint() {
  animation = 0;
  if (!fit) return;
  const room = frameRoom(frame);
  if (!still) {
    const reverse = frame === route.last;
    const hint = touchLayout.matches ? (reverse ? 'Swipe down to return' : 'Swipe up to walk') : (reverse ? 'Scroll back to return' : 'Scroll to walk');
    if (hintText.textContent !== hint) hintText.textContent = hint;
  }
  displayRoom(room);
  const position = still ? room : frame;
  if (range.value !== String(position)) range.value = String(position);
  const label = rooms[room].name + (still ? '' : ' · ' + Math.round(frame / route.last * 100) + '%');
  if (range.getAttribute('aria-valuetext') !== label) range.setAttribute('aria-valuetext', label);
  if (frame >= route.firstHit - motionPerSheet) loadMask(variant);
  if (still) {
    if (!showPoster(room)) hotspot.hidden = true;
    return;
  }

  const index = Math.floor(frame / motionPerSheet);
  const highIndex = Math.floor(frame / route.perSheet);
  trim(motionSheets, index, 1);
  trim(detailSheets, highIndex, 0);
  const atStop = route.stops[room] === frame;
  const seenStop = atStop && showPoster(room);
  // At the entrance, give the immediately visible photograph first use of the connection.
  if (frame === 0 && !seenStop && !poster.complete) return;
  const quick = sheet(index, false, seenStop ? 'low' : 'high');
  if (quick.ready && !conserveData && frame > 0) sheet(index + lastDirection, false, 'low');
  if (seenStop) return;

  let detailed = detailSheets.get(highIndex);
  if (quick.failed || (detailFrame === frame && quick.ready)) detailed = sheet(highIndex, true, quick.failed ? 'high' : 'low');
  if (detailed?.ready) {
    drawSheet(detailed, frame, true);
  } else if (quick.ready) {
    drawSheet(quick, frame, false);
  } else if (quick.failed && detailed?.failed) {
    switchToPhotos();
  } else if (painted < 0 || frameRoom(painted) !== room) {
    if (!showPoster(room)) hotspot.hidden = true;
  }
}

function queuePaint() {
  if (!animation) animation = requestAnimationFrame(paint);
}

function setFrame(value) {
  const next = clamp(Math.round(value), 0, route.last);
  if (next === frame) return;
  lastDirection = Math.sign(next - frame);
  frame = next;
  detailFrame = -1;
  clearTimeout(detailTimer);
  if (!still && !conserveData && !route.stops.includes(frame)) {
    detailTimer = setTimeout(() => { detailFrame = frame; queuePaint(); }, 420);
  }
  queuePaint();
}

function readScroll() {
  if (!still && !guideReturn) setFrame(window.scrollY / travelDistance * route.last);
}

function goTo(value) {
  setFrame(value);
  if (still) setPoster(frameRoom(frame));
  else window.scrollTo({top: frame / route.last * travelDistance, behavior: 'instant'});
}

function changeMotion(value) {
  clearTimeout(detailTimer);
  detailFrame = -1;
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
    travelDistance = Math.max(1, tour.offsetHeight - viewport.offsetHeight);
    window.scrollTo({top: frame / route.last * travelDistance, behavior: 'instant'});
  }
  painted = -1;
  paintedLayer = '';
  resize();
  queuePaint();
}

function setLayout() {
  variant = touchLayout.matches ? 'touch' : 'wide';
  trim(motionSheets, -2, 0);
  trim(detailSheets, -2, 0);
  requestedMask = '';
  maskPixels = null;
  fit = null;
  if (still) setPoster(frameRoom(frame));
  $('#hint-text').textContent = still ? 'Choose a room below' : (touchLayout.matches ? 'Swipe up to walk' : 'Scroll to walk');
  resize();
}

function openGuide(source) {
  if (guide.open) return;
  guideReturn = {source, frame: painted < 0 ? frame : painted};
  setFrame(guideReturn.frame);
  document.documentElement.classList.add('guide-open');
  const photo = guide.querySelector('.guide-photo');
  if (!photo.hasAttribute('src')) photo.src = photo.dataset.src;
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
    if (missingFrames && still) {
      missingFrames = false;
      trim(motionSheets, -2, 0);
      trim(detailSheets, -2, 0);
    }
    changeMotion(!still);
  });
  window.addEventListener('scroll', readScroll, {passive: true});
  new ResizeObserver(resize).observe(scene);
  new ResizeObserver(measureCaption).observe(caption);
  poster.addEventListener('load', queuePaint);
  poster.addEventListener('error', queuePaint);
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
    if (guide.open || !guideReturn) return;
    const {source, frame: returnFrame} = guideReturn;
    document.documentElement.classList.remove('guide-open');
    (source.hidden ? $('#guide-button') : source).focus({preventScroll: true});
    goTo(returnFrame);
    guideReturn = null;
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
  setLayout();
  if (reducedMotion.matches) changeMotion(true);
  else readScroll();
}

start().catch(() => {
  document.body.classList.remove('ready', 'still');
  controls.hidden = true;
  motion.hidden = true;
  $('#static-tour').hidden = false;
});
