const files = window.ARCHIVE_FILES || [];

const typeLabels = {
  all: 'All',
  document: 'Docs',
  image: 'Images',
  spreadsheet: 'Sheets',
  presentation: 'Decks',
  design: 'Design',
  archive: 'Archives',
  font: 'Fonts',
  other: 'Other'
};

const tokenLabels = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOC',
  xls: 'XLS',
  xlsx: 'XLS',
  ppt: 'PPT',
  pptx: 'PPT',
  jpg: 'IMG',
  jpeg: 'IMG',
  png: 'IMG',
  ai: 'AI',
  psd: 'PSD',
  twb: 'TWB',
  zip: 'ZIP',
  rar: 'RAR',
  ttf: 'FNT',
  otf: 'FNT'
};

const categoryColors = {
  document: ['rgba(255, 107, 107, 0.55)', 'rgba(246, 200, 95, 0.42)'],
  image: ['rgba(36, 198, 160, 0.5)', 'rgba(73, 120, 232, 0.32)'],
  spreadsheet: ['rgba(36, 198, 160, 0.45)', 'rgba(246, 200, 95, 0.5)'],
  presentation: ['rgba(169, 140, 245, 0.5)', 'rgba(255, 107, 107, 0.32)'],
  design: ['rgba(73, 120, 232, 0.44)', 'rgba(246, 200, 95, 0.42)'],
  archive: ['rgba(31, 36, 48, 0.2)', 'rgba(255, 107, 107, 0.34)'],
  font: ['rgba(246, 200, 95, 0.52)', 'rgba(36, 198, 160, 0.32)'],
  other: ['rgba(169, 140, 245, 0.36)', 'rgba(36, 198, 160, 0.24)']
};

let state = {
  query: '',
  year: 'all',
  type: 'all',
  sort: 'path',
  view: 'grid'
};

const nodes = {
  search: document.querySelector('#searchInput'),
  sort: document.querySelector('#sortSelect'),
  yearFilters: document.querySelector('#yearFilters'),
  typeFilters: document.querySelector('#typeFilters'),
  resultCount: document.querySelector('#resultCount'),
  clear: document.querySelector('#clearFilters'),
  grid: document.querySelector('#fileGrid'),
  totalFiles: document.querySelector('#totalFiles'),
  totalSize: document.querySelector('#totalSize'),
  imageCount: document.querySelector('#imageCount'),
  yearRange: document.querySelector('#yearRange'),
  heroPreview: document.querySelector('#heroPreview'),
  visualStrip: document.querySelector('#visualStrip'),
  folderList: document.querySelector('#folderList')
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units.shift();
  while (value >= 1024 && units.length) {
    value /= 1024;
    unit = units.shift();
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

function unique(values) {
  return [...new Set(values)].filter(Boolean);
}

function makeButton(label, value, activeValue, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = value === activeValue ? 'is-active' : '';
  button.addEventListener('click', () => onClick(value));
  return button;
}

function renderFilters() {
  const years = ['all', ...unique(files.map(file => file.year)).sort()];
  nodes.yearFilters.replaceChildren(...years.map(year => {
    const label = year === 'all' ? 'All' : year;
    return makeButton(label, year, state.year, value => {
      state.year = value;
      render();
    });
  }));

  const categories = ['all', ...unique(files.map(file => file.category)).sort()];
  nodes.typeFilters.replaceChildren(...categories.map(type => {
    return makeButton(typeLabels[type] || type, type, state.type, value => {
      state.type = value;
      render();
    });
  }));
}

function filteredFiles() {
  const query = state.query.trim().toLowerCase();
  return files
    .filter(file => state.year === 'all' || file.year === state.year)
    .filter(file => state.type === 'all' || file.category === state.type)
    .filter(file => {
      if (!query) return true;
      return `${file.name} ${file.path} ${file.extension} ${file.category} ${file.year}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      if (state.sort === 'name') return a.name.localeCompare(b.name, undefined, { numeric: true });
      if (state.sort === 'size') return b.size - a.size;
      if (state.sort === 'modified') return b.modified.localeCompare(a.modified);
      return a.path.localeCompare(b.path, undefined, { numeric: true });
    });
}

function cardFor(file) {
  const card = document.createElement('article');
  card.className = 'file-card';
  const [tokenA, tokenB] = categoryColors[file.category] || categoryColors.other;
  card.style.setProperty('--token-a', tokenA);
  card.style.setProperty('--token-b', tokenB);

  if (file.preview) {
    const image = document.createElement('img');
    image.className = 'file-preview';
    image.src = encodeURI(file.preview);
    image.alt = file.name;
    image.loading = 'lazy';
    card.append(image);
  } else {
    const token = document.createElement('div');
    token.className = 'file-token';
    const label = document.createElement('span');
    label.textContent = tokenLabels[file.extension] || file.extension.slice(0, 4).toUpperCase();
    token.append(label);
    card.append(token);
  }

  const body = document.createElement('div');
  body.className = 'file-body';
  const title = document.createElement('h3');
  title.className = 'file-name';
  title.textContent = file.name;
  const path = document.createElement('p');
  path.className = 'file-path';
  path.textContent = file.folder || file.path;
  const meta = document.createElement('p');
  meta.className = 'file-meta';
  meta.textContent = `${file.year} | ${formatSize(file.size)} | ${file.modified}`;
  body.append(title, path, meta);

  const foot = document.createElement('div');
  foot.className = 'file-foot';
  const pill = document.createElement('span');
  pill.className = 'type-pill';
  pill.textContent = file.extension;
  const link = document.createElement('a');
  link.className = 'open-link';
  link.href = encodeURI(file.href);
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Open';
  foot.append(pill, link);

  card.append(body, foot);
  return card;
}

function renderFiles() {
  const list = filteredFiles();
  nodes.grid.classList.toggle('is-list', state.view === 'list');
  nodes.resultCount.textContent = `${list.length} ${list.length === 1 ? 'file' : 'files'}`;

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No files match this view.';
    nodes.grid.replaceChildren(empty);
    return;
  }

  nodes.grid.replaceChildren(...list.map(cardFor));
}

function renderStats() {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const imageCount = files.filter(file => file.category === 'image').length;
  const years = unique(files.map(file => file.year)).sort();
  nodes.totalFiles.textContent = files.length.toString();
  nodes.totalSize.textContent = formatSize(totalSize);
  nodes.imageCount.textContent = imageCount.toString();
  nodes.yearRange.textContent = years.length ? `${years[0]}-${years[years.length - 1]}` : 'None';
}

function featuredImages() {
  const priority = ['Logo', 'VI', '海报', 'SISMU', '主视觉', 'K票'];
  const images = files.filter(file => file.category === 'image');
  return images
    .map(file => ({
      file,
      score: priority.reduce((sum, word, index) => sum + (file.name.includes(word) ? 100 - index : 0), 0) + Math.min(file.size / 1000000, 20)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.file);
}

function renderHeroAndVisuals() {
  const images = featuredImages();
  const hero = images[0];
  if (hero) {
    const image = document.createElement('img');
    image.src = encodeURI(hero.preview);
    image.alt = hero.name;
    nodes.heroPreview.replaceChildren(image);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'fallback-art';
    fallback.textContent = 'KK';
    nodes.heroPreview.replaceChildren(fallback);
  }

  const links = images.slice(0, 6).map(file => {
    const link = document.createElement('a');
    link.className = 'visual-link';
    link.href = encodeURI(file.href);
    link.target = '_blank';
    link.rel = 'noopener';
    const image = document.createElement('img');
    image.src = encodeURI(file.preview);
    image.alt = file.name;
    image.loading = 'lazy';
    const label = document.createElement('span');
    label.textContent = file.name;
    link.append(image, label);
    return link;
  });
  nodes.visualStrip.replaceChildren(...links);
}

function renderFolders() {
  const byFolder = new Map();
  files.forEach(file => {
    const folder = file.folder || '/';
    const entry = byFolder.get(folder) || { folder, count: 0, size: 0 };
    entry.count += 1;
    entry.size += file.size;
    byFolder.set(folder, entry);
  });
  const max = Math.max(...[...byFolder.values()].map(item => item.count), 1);
  const cards = [...byFolder.values()]
    .sort((a, b) => b.count - a.count || a.folder.localeCompare(b.folder))
    .slice(0, 12)
    .map(item => {
      const card = document.createElement('article');
      card.className = 'folder-card';
      const title = document.createElement('h3');
      title.textContent = item.folder;
      const detail = document.createElement('p');
      detail.textContent = `${item.count} files | ${formatSize(item.size)}`;
      const meter = document.createElement('div');
      meter.className = 'meter';
      const fill = document.createElement('span');
      fill.style.setProperty('--value', `${Math.max(8, Math.round((item.count / max) * 100))}%`);
      meter.append(fill);
      card.append(title, detail, meter);
      return card;
    });
  nodes.folderList.replaceChildren(...cards);
}

function render() {
  renderFilters();
  renderFiles();
}

nodes.search.addEventListener('input', event => {
  state.query = event.target.value;
  renderFiles();
});

nodes.sort.addEventListener('change', event => {
  state.sort = event.target.value;
  renderFiles();
});

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(item => {
      item.classList.toggle('is-active', item === button);
    });
    renderFiles();
  });
});

nodes.clear.addEventListener('click', () => {
  state = { query: '', year: 'all', type: 'all', sort: 'path', view: state.view };
  nodes.search.value = '';
  nodes.sort.value = 'path';
  render();
});

renderStats();
renderHeroAndVisuals();
renderFolders();
render();
