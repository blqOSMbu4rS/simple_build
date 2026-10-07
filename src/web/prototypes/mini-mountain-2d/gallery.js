try {
  const response = await fetch('./assets/manifest.json');
  if (!response.ok) throw new Error(`Asset manifest: ${response.status}`);
  const manifest = await response.json();
  const categories = { views: '完整视图', layers: '房间、岩壳与屋顶', furniture: '独立家具' };
  for (const [category, label] of Object.entries(categories)) {
    const heading = document.createElement('h2'); heading.textContent = label;
    const grid = document.createElement('div'); grid.className = 'gallery';
    for (const asset of manifest.assets.filter(entry => entry.category === category)) {
      const link = document.createElement('a'); link.className = 'asset'; link.href = `./assets/${category}/${asset.id}.png`; link.download = `${asset.id}.png`;
      const image = new Image(); image.src = link.href; image.alt = asset.label; image.loading = 'lazy';
      const caption = document.createElement('span'); caption.textContent = asset.label;
      link.append(image, caption); grid.append(link);
    }
    document.querySelector('#gallery').append(heading, grid);
  }
  document.querySelector('#gallery-status').textContent = `共 ${manifest.assets.length} 张素材`;
} catch (error) { document.querySelector('#gallery-status').textContent = '素材暂时未能加载，请刷新重试。'; console.error(error); }
