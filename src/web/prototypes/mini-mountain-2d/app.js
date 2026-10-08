const viewport = document.querySelector('#viewport'), canvas = viewport.querySelector('canvas');
const loading = document.querySelector('#loading'), context = canvas.getContext('2d');
const fallback = document.querySelector('#fallback');
try {
  if (!context) throw new Error('Canvas 2D unavailable');
  const response = await fetch('./assets/manifest.json');
  if (!response.ok) throw new Error(`Asset manifest: ${response.status}`);
  const manifest = await response.json(), images = new Map(), pending = new Map();
  let mode = manifest.modes[0], zoom = 1, pan = { x: 0, y: 0 }, width = 1, height = 1, selection = 0;
  function loadImage(entry) {
    if (images.has(entry.id)) return Promise.resolve(images.get(entry.id));
    if (pending.has(entry.id)) return pending.get(entry.id);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      const finish = (error) => {
        clearTimeout(timeout); image.onload = image.onerror = null;
        if (error) reject(error);
        else { images.set(entry.id, image); resolve(image); }
      };
      const timeout = setTimeout(() => finish(new Error(`Image timed out: ${entry.image}`)), 15000);
      image.onload = () => finish(); image.onerror = () => finish(new Error(`Image failed: ${entry.image}`));
      image.src = entry.image;
    }).finally(() => pending.delete(entry.id));
    pending.set(entry.id, promise); return promise;
  }
  const pointers = new Map();
  function render() {
    if (!images.has(mode.id)) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
    // Exported views share the same camera; switching layers only replaces pixels.
    const scale = Math.min(height / manifest.projection.span, width / 8.8) * zoom;
    const size = manifest.projection.span * scale;
    context.drawImage(images.get(mode.id), width / 2 - size / 2 + pan.x, height / 2 - size / 2 + pan.y, size, size);
    fallback.hidden = true;
    document.querySelector('#zoom').value = `${Math.round(zoom * 100)}%`;
  }
  function resize() { ({ width, height } = viewport.getBoundingClientRect()); if (width && height) render(); }
  function reset() { zoom = 1; pan = { x: 0, y: 0 }; render(); }
  async function setMode(next) {
    const request = ++selection;
    loading.textContent = `正在加载${next.label}…`; loading.hidden = false;
    try { await loadImage(next); }
    catch (error) {
      if (request === selection) loading.textContent = `${next.label}暂时未能加载，点击该视图可重试。`;
      console.warn(error); return;
    }
    if (request !== selection) return;
    mode = next; viewport.dataset.viewMode = next.id;
    for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === next.id));
    document.querySelector('#current-layer').textContent = next.label;
    const download = document.querySelector('#download'); download.href = next.image; download.download = `mini-mountain-${next.id}.png`;
    render(); loading.hidden = true;
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
  new ResizeObserver(resize).observe(viewport); resize(); await setMode(mode);
} catch (error) { loading.textContent = '查看功能暂时未能加载，可先查看整体图片，或刷新重试。'; console.error(error); }
