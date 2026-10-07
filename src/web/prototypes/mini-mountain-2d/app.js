const viewport = document.querySelector('#viewport'), canvas = viewport.querySelector('canvas');
const loading = document.querySelector('#loading'), context = canvas.getContext('2d');
try {
  if (!context) throw new Error('Canvas 2D unavailable');
  const response = await fetch('./assets/manifest.json');
  if (!response.ok) throw new Error(`Asset manifest: ${response.status}`);
  const manifest = await response.json(), images = new Map();
  await Promise.all(manifest.modes.map(async mode => {
    const image = new Image(); image.src = mode.image; await image.decode(); images.set(mode.id, image);
  }));
  let mode = manifest.modes[0], zoom = 1, pan = { x: 0, y: 0 }, width = 1, height = 1;
  const pointers = new Map();
  function render() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    const scale = Math.min(height / mode.frameHeight, width / 8.8) * zoom;
    const size = manifest.projection.span * scale;
    const offset = (mode.focusY - manifest.projection.targetY) * Math.cos(manifest.projection.elevation * Math.PI / 180) * scale;
    context.drawImage(images.get(mode.id), width / 2 - size / 2 + pan.x, height / 2 - size / 2 + offset + pan.y, size, size);
    document.querySelector('#zoom').value = `${Math.round(zoom * 100)}%`;
  }
  function resize() { ({ width, height } = viewport.getBoundingClientRect()); if (width && height) render(); }
  function reset() { zoom = 1; pan = { x: 0, y: 0 }; render(); }
  function setMode(next) {
    mode = next; viewport.dataset.viewMode = next.id;
    for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === next.id));
    document.querySelector('#current-layer').textContent = next.label;
    const download = document.querySelector('#download'); download.href = next.image; download.download = `mini-mountain-${next.id}.png`;
    reset();
  }
  for (const [i, entry] of manifest.modes.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.mode = entry.id;
    const number = document.createElement('span'); number.textContent = String(i + 1).padStart(2, '0');
    button.append(number, entry.label); button.addEventListener('click', () => setMode(entry)); document.querySelector('#modes').append(button);
  }
  function scaleBy(factor) { zoom = Math.max(.75, Math.min(2.5, zoom * factor)); render(); }
  document.querySelector('#zoom-in').addEventListener('click', () => scaleBy(1.2));
  document.querySelector('#zoom-out').addEventListener('click', () => scaleBy(1 / 1.2));
  document.querySelector('#reset-view').addEventListener('click', reset);
  canvas.addEventListener('wheel', event => { event.preventDefault(); scaleBy(Math.exp(-event.deltaY * .001)); }, { passive: false });
  canvas.addEventListener('pointerdown', event => { canvas.setPointerCapture(event.pointerId); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); canvas.focus(); });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId), next = { x: event.clientX, y: event.clientY };
    if (pointers.size === 1) { pan.x += next.x - previous.x; pan.y += next.y - previous.y; }
    else if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
      const before = Math.hypot(previous.x - other.x, previous.y - other.y), after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 1) zoom = Math.max(.75, Math.min(2.5, zoom * after / before));
    }
    pointers.set(event.pointerId, next); render();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => pointers.delete(e.pointerId));
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Home') reset();
    else if (event.key === '+' || event.key === '=') scaleBy(1.2);
    else if (event.key === '-') scaleBy(1 / 1.2);
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      pan.x += event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0;
      pan.y += event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0; render();
    } else return;
    event.preventDefault();
  });
  new ResizeObserver(resize).observe(viewport); resize(); setMode(mode); loading.hidden = true;
} catch (error) { loading.textContent = '图片暂时未能加载，请刷新重试。'; console.error(error); }
