const typeLabels = {
  all: 'All types',
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
  document: ['rgba(255, 122, 26, 0.45)', 'rgba(255, 204, 51, 0.38)'],
  image: ['rgba(72, 214, 163, 0.42)', 'rgba(93, 130, 255, 0.28)'],
  spreadsheet: ['rgba(72, 214, 163, 0.38)', 'rgba(255, 204, 51, 0.35)'],
  presentation: ['rgba(255, 136, 169, 0.42)', 'rgba(255, 122, 26, 0.26)'],
  design: ['rgba(93, 130, 255, 0.35)', 'rgba(255, 204, 51, 0.26)'],
  archive: ['rgba(25, 22, 19, 0.14)', 'rgba(255, 122, 26, 0.26)'],
  font: ['rgba(255, 204, 51, 0.44)', 'rgba(72, 214, 163, 0.24)'],
  other: ['rgba(255, 136, 169, 0.3)', 'rgba(93, 130, 255, 0.2)']
};

const laneColors = ['#ffe0bf', '#fff0ad', '#dfffe9', '#e9e2ff', '#ffddec', '#dcf6ff'];
const draftKey = 'kkAssetBoardDraftV1';
const uploadDbName = 'kkAssetBoardUploads';
const uploadStoreName = 'files';
const localObjectUrls = new Map();
const localBlobs = new Map();

const defaultMeta = {
  repo: {
    owner: 'Bdkit50N',
    name: 'SISMU-KK',
    branch: 'main',
    manifestPath: 'data/files.js',
    inventoryPath: 'data/inventory.js',
    assetRoot: 'files/03-KK音乐节'
  },
  statuses: ['Needs review', 'Approved', 'In use', 'Archived'],
  folders: [],
  collaborators: []
};

let files = (window.ARCHIVE_FILES || []).map(normalizeAsset);
let meta = normalizeMeta(window.ARCHIVE_META || defaultMeta);
const savedDraft = loadDraft();

if (savedDraft) {
  files = (savedDraft.files || files).map(normalizeAsset);
  meta = normalizeMeta(savedDraft.meta || meta);
}

const savedRepo = JSON.parse(localStorage.getItem('kkBoardRepo') || 'null');
const state = {
  repo: { ...meta.repo, ...(savedRepo || {}) },
  token: sessionStorage.getItem('kkBoardToken') || '',
  connected: false,
  changes: savedDraft?.changes || [],
  search: '',
  typeFilter: 'all',
  editingId: null
};

const nodes = {
  repoLabel: document.querySelector('#repoLabel'),
  modeLabel: document.querySelector('#modeLabel'),
  syncButton: document.querySelector('#syncButton'),
  connectButton: document.querySelector('#connectButton'),
  publishButton: document.querySelector('#publishButton'),
  pendingStatus: document.querySelector('#pendingStatus'),
  connectionStatus: document.querySelector('#connectionStatus'),
  totalAssets: document.querySelector('#totalAssets'),
  totalFolders: document.querySelector('#totalFolders'),
  searchInput: document.querySelector('#searchInput'),
  typeFilter: document.querySelector('#typeFilter'),
  newFolderButton: document.querySelector('#newFolderButton'),
  addFilesButton: document.querySelector('#addFilesButton'),
  fileInput: document.querySelector('#fileInput'),
  dropPanel: document.querySelector('#dropPanel'),
  dropPanelButton: document.querySelector('#dropPanelButton'),
  visualRail: document.querySelector('#visualRail'),
  folderBoard: document.querySelector('#folderBoard'),
  connectDialog: document.querySelector('#connectDialog'),
  connectForm: document.querySelector('#connectForm'),
  disconnectButton: document.querySelector('#disconnectButton'),
  repoOwner: document.querySelector('#repoOwner'),
  repoName: document.querySelector('#repoName'),
  repoBranch: document.querySelector('#repoBranch'),
  repoToken: document.querySelector('#repoToken'),
  editDialog: document.querySelector('#editDialog'),
  editForm: document.querySelector('#editForm'),
  editTitle: document.querySelector('#editTitle'),
  editName: document.querySelector('#editName'),
  editFolder: document.querySelector('#editFolder'),
  editOwner: document.querySelector('#editOwner'),
  editStatus: document.querySelector('#editStatus'),
  editTags: document.querySelector('#editTags'),
  editNotes: document.querySelector('#editNotes'),
  deleteAssetButton: document.querySelector('#deleteAssetButton'),
  folderDialog: document.querySelector('#folderDialog'),
  folderForm: document.querySelector('#folderForm'),
  newFolderName: document.querySelector('#newFolderName'),
  folderOptions: document.querySelector('#folderOptions'),
  toast: document.querySelector('#toast')
};

function normalizeMeta(input) {
  const merged = {
    ...defaultMeta,
    ...input,
    repo: { ...defaultMeta.repo, ...(input.repo || {}) },
    statuses: input.statuses?.length ? input.statuses : defaultMeta.statuses,
    folders: input.folders || [],
    collaborators: input.collaborators || []
  };
  const known = new Set(merged.folders.map(folder => folder.name));
  files.forEach(file => {
    if (file.folder && !known.has(file.folder)) {
      merged.folders.push({
        id: `folder-${known.size + 1}`,
        name: file.folder,
        parent: parentFolder(file.folder),
        steward: '',
        notes: ''
      });
      known.add(file.folder);
    }
  });
  sortFolders();
  return merged;
}

function normalizeAsset(asset) {
  const extension = (asset.extension || asset.name?.split('.').pop() || 'file').toLowerCase();
  return {
    id: asset.id ?? Date.now(),
    name: asset.name || 'Untitled file',
    path: asset.path || '',
    folder: asset.folder || '',
    year: asset.year || inferYear(asset.folder || asset.path),
    extension,
    category: asset.category || categoryFor(extension),
    size: asset.size || 0,
    modified: asset.modified || new Date().toISOString().slice(0, 10),
    href: asset.href || '',
    preview: asset.preview || (categoryFor(extension) === 'image' ? asset.href : ''),
    status: asset.status || 'Needs review',
    owner: asset.owner || '',
    tags: Array.isArray(asset.tags) ? asset.tags : parseTags(asset.tags || ''),
    notes: asset.notes || '',
    blobKey: asset.blobKey || '',
    draft: Boolean(asset.draft)
  };
}

function categoryFor(extension) {
  const ext = extension.toLowerCase().replace('.', '');
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv', 'tsv'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'presentation';
  if (['ai', 'psd', 'twb'].includes(ext)) return 'design';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
  return 'other';
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function parentFolder(folder) {
  if (!folder || !folder.includes('/')) return '/';
  return folder.split('/').slice(0, -1).join('/');
}

function inferYear(value) {
  const match = String(value || '').match(/\b(20\d{2})\b/);
  return match ? match[1] : new Date().getFullYear().toString();
}

function cleanFolder(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/');
}

function safeName(name) {
  return String(name || 'file').replace(/[\\/]/g, '-');
}

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

function uniqueId(prefix) {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey) || 'null');
  } catch {
    return null;
  }
}

function saveDraft() {
  localStorage.setItem(draftKey, JSON.stringify({
    files: files.map(cleanAssetForDraft),
    meta,
    changes: state.changes
  }));
}

function clearDraft() {
  localStorage.removeItem(draftKey);
}

function queueManifest(label) {
  state.changes = state.changes.filter(change => change.type !== 'manifest');
  state.changes.push({ type: 'manifest', label });
}

function refreshUploadChange(asset) {
  state.changes = state.changes.filter(change => !(change.type === 'upload' && String(change.assetId) === String(asset.id)));
  state.changes.push({
    type: 'upload',
    assetId: asset.id,
    blobKey: asset.blobKey,
    href: asset.href,
    path: asset.path,
    label: `Upload ${asset.name}`
  });
}

function removeUploadChange(asset) {
  state.changes = state.changes.filter(change => !(change.type === 'upload' && String(change.assetId) === String(asset.id)));
  if (asset.blobKey) void deleteUploadBlob(asset.blobKey);
  if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
}

function sortFolders() {
  meta.folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function folderNames() {
  return unique([...meta.folders.map(folder => folder.name), ...files.map(file => file.folder)])
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function allLaneNames() {
  const names = folderNames();
  if (files.some(file => !file.folder)) names.unshift('');
  return names;
}

function hrefFor(folder, name) {
  return [state.repo.assetRoot, folder, name].filter(Boolean).join('/');
}

function pathFor(folder, name) {
  return [state.repo.assetRoot.replace(/^files\//, ''), folder, name].filter(Boolean).join('/');
}

function isFolderOrChild(value, folder) {
  return value === folder || value.startsWith(`${folder}/`);
}

function rebaseFolder(value, fromFolder, toFolder) {
  if (value === fromFolder) return toFolder;
  if (value.startsWith(`${fromFolder}/`)) return `${toFolder}${value.slice(fromFolder.length)}`;
  return value;
}

function hasFileDrag(dataTransfer) {
  return Array.from(dataTransfer?.types || []).includes('Files');
}

function render() {
  renderHeader();
  renderFilters();
  renderVisualRail();
  renderBoard();
}

function renderHeader() {
  nodes.repoLabel.textContent = `${state.repo.owner} / ${state.repo.name}`;
  nodes.modeLabel.textContent = state.connected ? 'Team board' : 'No-login draft';
  nodes.connectionStatus.textContent = state.connected ? 'Online' : 'Local';
  nodes.connectionStatus.classList.toggle('is-live', state.connected);
  nodes.pendingStatus.textContent = `${state.changes.length} ${state.changes.length === 1 ? 'change' : 'changes'}`;
  nodes.pendingStatus.classList.toggle('is-dirty', state.changes.length > 0);
  nodes.publishButton.disabled = state.changes.length === 0;
  nodes.totalAssets.textContent = files.length.toString();
  nodes.totalFolders.textContent = folderNames().length.toString();
}

function renderFilters() {
  const categories = ['all', ...unique(files.map(file => file.category)).sort()];
  fillSelect(nodes.typeFilter, categories.map(type => [type, typeLabels[type] || type]), state.typeFilter);
  fillSelect(nodes.editStatus, meta.statuses.map(status => [status, status]), meta.statuses[0]);
  nodes.folderOptions.replaceChildren(...folderNames().map(folder => {
    const option = document.createElement('option');
    option.value = folder;
    return option;
  }));
}

function fillSelect(select, options, selected) {
  const previous = select.value || selected;
  select.replaceChildren(...options.map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  select.value = options.some(([value]) => value === previous) ? previous : selected;
}

function renderBoard() {
  const lanes = allLaneNames();
  nodes.folderBoard.replaceChildren(...lanes.map((folder, index) => laneFor(folder, index)));
}

function renderVisualRail() {
  const visuals = files
    .filter(asset => assetImageSrc(asset))
    .sort((a, b) => Number(Boolean(b.draft)) - Number(Boolean(a.draft)) || b.modified.localeCompare(a.modified))
    .slice(0, 8);

  nodes.visualRail.replaceChildren(...visuals.map(asset => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'visual-tile';
    tile.addEventListener('click', () => openEdit(asset.id));

    const image = document.createElement('img');
    image.loading = 'lazy';
    image.alt = asset.name;
    image.src = assetImageSrc(asset);

    const label = document.createElement('span');
    label.textContent = asset.name;
    tile.append(image, label);
    return tile;
  }));
}

function laneFor(folder, index) {
  const lane = document.createElement('section');
  lane.className = 'folder-lane';
  lane.dataset.folder = folder;
  lane.style.setProperty('--lane-color', laneColors[index % laneColors.length]);

  const assets = filteredAssets(folder);
  const head = document.createElement('div');
  head.className = 'lane-head';
  const titleWrap = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = folder ? parentFolder(folder) : 'No folder';
  const title = document.createElement('h2');
  title.textContent = folder || 'Unsorted';
  titleWrap.append(eyebrow, title);
  const count = document.createElement('span');
  count.textContent = assets.length.toString();
  head.append(titleWrap, count);

  const actions = document.createElement('div');
  actions.className = 'lane-actions';
  if (folder) {
    const rename = miniButton('Rename', () => renameFolder(folder));
    const remove = miniButton('Delete', () => deleteFolder(folder));
    actions.append(rename, remove);
  }

  const body = document.createElement('div');
  body.className = 'lane-body';
  body.dataset.folder = folder;
  body.addEventListener('dragover', event => {
    event.preventDefault();
    lane.classList.add('is-over');
  });
  body.addEventListener('dragleave', () => lane.classList.remove('is-over'));
  body.addEventListener('drop', event => {
    event.preventDefault();
    event.stopPropagation();
    lane.classList.remove('is-over');
    document.body.classList.remove('is-file-drag');
    if (event.dataTransfer.files?.length) {
      void addFiles(event.dataTransfer.files, folder);
      return;
    }
    moveAsset(event.dataTransfer.getData('text/plain'), folder);
  });

  if (assets.length) body.replaceChildren(...assets.map(assetCard));
  else body.append(emptyLane());

  lane.append(head, actions, body);
  return lane;
}

function filteredAssets(folder) {
  const query = state.search.trim().toLowerCase();
  return files
    .filter(asset => asset.folder === folder)
    .filter(asset => state.typeFilter === 'all' || asset.category === state.typeFilter)
    .filter(asset => {
      if (!query) return true;
      return [
        asset.name,
        asset.path,
        asset.folder,
        asset.category,
        asset.extension,
        asset.status,
        asset.owner,
        asset.tags.join(' '),
        asset.notes
      ].join(' ').toLowerCase().includes(query);
    })
    .sort((a, b) => b.modified.localeCompare(a.modified) || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function assetCard(asset) {
  const card = document.createElement('article');
  card.className = 'asset-card';
  card.classList.toggle('is-local', asset.draft);
  card.draggable = true;
  card.dataset.id = asset.id;
  card.addEventListener('dragstart', event => {
    event.dataTransfer.setData('text/plain', String(asset.id));
    card.classList.add('is-dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('is-dragging'));

  const previewSrc = assetImageSrc(asset);
  if (previewSrc) {
    const preview = document.createElement('div');
    preview.className = 'asset-preview';
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.alt = asset.name;
    image.src = previewSrc;
    preview.append(image);
    card.append(preview);
  }

  const top = document.createElement('div');
  top.className = 'asset-top';
  top.append(fileToken(asset));

  const text = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = asset.name;
  const metaLine = document.createElement('p');
  metaLine.className = 'asset-meta';
  metaLine.textContent = `${asset.extension.toUpperCase()} | ${formatSize(asset.size)}${asset.draft ? ' | LOCAL' : ''}`;
  text.append(title, metaLine);
  top.append(text);

  const tags = document.createElement('p');
  tags.className = 'asset-meta';
  tags.textContent = asset.tags.length ? asset.tags.join(', ') : (asset.draft ? 'Local draft' : asset.status);

  const footer = document.createElement('footer');
  const open = document.createElement('a');
  open.className = 'mini-button primary';
  open.href = encodeURI(asset.objectUrl || asset.href || '#');
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = 'Open';
  if (asset.blobKey && !asset.objectUrl) {
    open.addEventListener('click', event => {
      event.preventDefault();
      void openLocalAsset(asset);
    });
  }
  const edit = miniButton('Edit', () => openEdit(asset.id));
  footer.append(open, edit);

  card.append(top, tags, footer);
  return card;
}

function fileToken(asset) {
  const token = document.createElement('span');
  token.className = 'file-token';
  const [tokenA, tokenB] = categoryColors[asset.category] || categoryColors.other;
  token.style.setProperty('--token-a', tokenA);
  token.style.setProperty('--token-b', tokenB);
  token.textContent = tokenLabels[asset.extension] || asset.extension.slice(0, 4).toUpperCase();
  return token;
}

function assetImageSrc(asset) {
  if (asset.category !== 'image') return '';
  return asset.objectUrl || asset.preview || asset.href || '';
}

function emptyLane() {
  const empty = document.createElement('div');
  empty.className = 'empty-lane';
  empty.textContent = 'Drop here';
  return empty;
}

function miniButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mini-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function moveAsset(id, nextFolder) {
  const asset = files.find(item => String(item.id) === String(id));
  if (!asset || asset.folder === nextFolder) return;
  const oldHref = asset.href;
  const oldPath = asset.path;
  asset.folder = nextFolder;
  asset.year = inferYear(nextFolder);
  asset.href = hrefFor(nextFolder, asset.name);
  asset.path = pathFor(nextFolder, asset.name);
  asset.preview = asset.category === 'image' ? asset.href : '';
  asset.modified = new Date().toISOString().slice(0, 10);
  ensureFolder(nextFolder);
  if (asset.draft) {
    refreshUploadChange(asset);
  } else {
    state.changes.push({ type: 'move', oldHref, newHref: asset.href, oldPath, newPath: asset.path, label: `Move ${asset.name}` });
  }
  queueManifest(`Update ${asset.name}`);
  saveDraft();
  toast(`Moved to ${nextFolder || 'Unsorted'}`);
  render();
}

function ensureFolder(name) {
  if (!name) return;
  if (!meta.folders.some(folder => folder.name === name)) {
    meta.folders.push({
      id: uniqueId('folder'),
      name,
      parent: parentFolder(name),
      steward: '',
      notes: ''
    });
    sortFolders();
  }
}

function createFolder(event) {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') {
    nodes.folderDialog.close();
    return;
  }
  const name = cleanFolder(nodes.newFolderName.value);
  if (!name) return;
  ensureFolder(name);
  state.changes.push({ type: 'folder-create', folder: name, label: `Create ${name}` });
  queueManifest(`Create folder ${name}`);
  saveDraft();
  nodes.folderDialog.close();
  nodes.folderForm.reset();
  toast('Folder created');
  render();
}

function renameFolder(folder) {
  const nextFolder = cleanFolder(prompt('Rename folder', folder) || '');
  if (!nextFolder || nextFolder === folder) return;
  const affected = files.filter(asset => isFolderOrChild(asset.folder, folder));
  const folderCount = meta.folders.filter(item => isFolderOrChild(item.name, folder)).length;
  if ((affected.length || folderCount) && !confirm(`Move ${affected.length} cards and ${folderCount} folders into ${nextFolder}?`)) return;

  meta.folders.forEach(item => {
    if (isFolderOrChild(item.name, folder)) {
      item.name = rebaseFolder(item.name, folder, nextFolder);
      item.parent = parentFolder(item.name);
    }
  });
  ensureFolder(nextFolder);

  affected.forEach(asset => {
    const oldHref = asset.href;
    const oldPath = asset.path;
    asset.folder = rebaseFolder(asset.folder, folder, nextFolder);
    asset.path = pathFor(asset.folder, asset.name);
    asset.href = hrefFor(asset.folder, asset.name);
    asset.preview = asset.category === 'image' ? asset.href : '';
    if (asset.draft) {
      refreshUploadChange(asset);
    } else {
      state.changes.push({ type: 'move', oldHref, newHref: asset.href, oldPath, newPath: asset.path, label: `Move ${asset.name}` });
    }
  });
  queueManifest(`Rename ${folder}`);
  sortFolders();
  saveDraft();
  toast('Folder renamed');
  render();
}

function deleteFolder(folder) {
  const affected = files.filter(asset => isFolderOrChild(asset.folder, folder));
  const folderCount = meta.folders.filter(item => isFolderOrChild(item.name, folder)).length;
  if ((affected.length || folderCount) && !confirm(`Delete ${folder}, ${folderCount} folders, and ${affected.length} cards?`)) return;
  files = files.filter(asset => !isFolderOrChild(asset.folder, folder));
  meta.folders = meta.folders.filter(item => !isFolderOrChild(item.name, folder));
  affected.forEach(asset => {
    if (asset.draft) {
      removeUploadChange(asset);
    } else {
      state.changes.push({ type: 'delete', href: asset.href, label: `Delete ${asset.name}` });
    }
  });
  queueManifest(`Delete ${folder}`);
  saveDraft();
  toast('Folder deleted');
  render();
}

function openEdit(id) {
  const asset = files.find(item => String(item.id) === String(id));
  if (!asset) return;
  state.editingId = id;
  nodes.editTitle.textContent = asset.name;
  nodes.editName.value = asset.name;
  nodes.editFolder.value = asset.folder;
  nodes.editOwner.value = asset.owner;
  nodes.editStatus.value = asset.status;
  nodes.editTags.value = asset.tags.join(', ');
  nodes.editNotes.value = asset.notes;
  nodes.editDialog.showModal();
}

function saveEdit(event) {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') {
    nodes.editDialog.close();
    return;
  }
  const asset = files.find(item => String(item.id) === String(state.editingId));
  if (!asset) return;
  const oldHref = asset.href;
  const oldPath = asset.path;
  const nextName = safeName(nodes.editName.value.trim() || asset.name);
  const nextFolder = cleanFolder(nodes.editFolder.value);

  asset.name = nextName;
  asset.folder = nextFolder;
  asset.year = inferYear(nextFolder);
  asset.href = hrefFor(nextFolder, nextName);
  asset.path = pathFor(nextFolder, nextName);
  asset.preview = asset.category === 'image' ? asset.href : '';
  asset.owner = nodes.editOwner.value.trim();
  asset.status = nodes.editStatus.value;
  asset.tags = parseTags(nodes.editTags.value);
  asset.notes = nodes.editNotes.value.trim();
  asset.modified = new Date().toISOString().slice(0, 10);
  ensureFolder(nextFolder);

  if (asset.draft) {
    refreshUploadChange(asset);
  } else if (oldHref !== asset.href) {
    state.changes.push({ type: 'move', oldHref, newHref: asset.href, oldPath, newPath: asset.path, label: `Move ${asset.name}` });
  }
  queueManifest(`Update ${asset.name}`);
  saveDraft();
  nodes.editDialog.close();
  toast('Saved locally');
  render();
}

function deleteEditingAsset() {
  const asset = files.find(item => String(item.id) === String(state.editingId));
  if (!asset || !confirm(`Delete ${asset.name}?`)) return;
  files = files.filter(item => String(item.id) !== String(asset.id));
  if (asset.draft) {
    removeUploadChange(asset);
  } else {
    state.changes.push({ type: 'delete', href: asset.href, label: `Delete ${asset.name}` });
  }
  queueManifest(`Remove ${asset.name}`);
  saveDraft();
  nodes.editDialog.close();
  toast('Deleted locally');
  render();
}

async function addFiles(fileList, targetFolder = '') {
  const incoming = Array.from(fileList || []).filter(file => file?.name && file.size >= 0);
  if (!incoming.length) return;
  let added = 0;

  try {
    for (const file of incoming) {
      const folder = folderForUpload(targetFolder, file);
      const name = safeName(file.name);
      const extension = name.split('.').pop() || 'file';
      const blobKey = uniqueId('blob');
      await putUploadBlob(blobKey, file);

      const asset = normalizeAsset({
        id: uniqueId('asset'),
        name,
        folder,
        year: inferYear(folder),
        extension,
        category: categoryFor(extension),
        size: file.size,
        modified: new Date(file.lastModified || Date.now()).toISOString().slice(0, 10),
        href: hrefFor(folder, name),
        path: pathFor(folder, name),
        blobKey,
        draft: true,
        status: 'Needs review'
      });

      ensureFolder(folder);
      asset.objectUrl = URL.createObjectURL(file);
      localObjectUrls.set(blobKey, asset.objectUrl);
      files.push(asset);
      refreshUploadChange(asset);
      added += 1;
    }
  } catch (error) {
    toast(error.message || 'Could not add files');
  }

  if (!added) return;
  queueManifest(`Add ${added} ${added === 1 ? 'file' : 'files'}`);
  saveDraft();
  toast(`${added} ${added === 1 ? 'file' : 'files'} added locally`);
  render();
}

function folderForUpload(targetFolder, file) {
  const base = cleanFolder(targetFolder);
  const relativePath = cleanFolder(file.webkitRelativePath || '');
  const relativeFolder = relativePath && relativePath !== file.name ? parentFolder(relativePath) : '';
  if (!relativeFolder || relativeFolder === '/') return base;
  return [base, relativeFolder].filter(Boolean).join('/');
}

async function openLocalAsset(asset) {
  const url = await objectUrlForAsset(asset);
  if (!url) {
    toast('Local file is missing');
    return;
  }
  window.open(url, '_blank', 'noopener');
}

async function objectUrlForAsset(asset) {
  if (asset.objectUrl) return asset.objectUrl;
  if (!asset.blobKey) return '';
  const existing = localObjectUrls.get(asset.blobKey);
  if (existing) {
    asset.objectUrl = existing;
    return existing;
  }
  const blob = await readUploadBlob(asset.blobKey);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  localObjectUrls.set(asset.blobKey, url);
  asset.objectUrl = url;
  return url;
}

async function hydrateLocalAssets() {
  const localAssets = files.filter(asset => asset.blobKey && !asset.objectUrl);
  if (!localAssets.length) return;
  let changed = false;
  for (const asset of localAssets) {
    if (await objectUrlForAsset(asset)) changed = true;
  }
  if (changed) {
    renderVisualRail();
    renderBoard();
  }
}

let uploadDbPromise;

function uploadDb() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (uploadDbPromise) return uploadDbPromise;
  uploadDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(uploadDbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(uploadStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return uploadDbPromise;
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function putUploadBlob(key, blob) {
  const db = await uploadDb();
  if (!db) {
    localBlobs.set(key, blob);
    localObjectUrls.set(key, URL.createObjectURL(blob));
    return;
  }
  const transaction = db.transaction(uploadStoreName, 'readwrite');
  transaction.objectStore(uploadStoreName).put(blob, key);
  await transactionDone(transaction);
}

async function readUploadBlob(key) {
  const db = await uploadDb();
  if (!db) return localBlobs.get(key) || null;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(uploadStoreName, 'readonly');
    const request = transaction.objectStore(uploadStoreName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteUploadBlob(key) {
  localBlobs.delete(key);
  const db = await uploadDb();
  if (!db) return;
  const transaction = db.transaction(uploadStoreName, 'readwrite');
  transaction.objectStore(uploadStoreName).delete(key);
  await transactionDone(transaction);
}

async function connect(event) {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') {
    nodes.connectDialog.close();
    return;
  }
  state.repo = {
    ...state.repo,
    owner: nodes.repoOwner.value.trim(),
    name: nodes.repoName.value.trim(),
    branch: nodes.repoBranch.value.trim() || 'main'
  };
  state.token = nodes.repoToken.value.trim();
  sessionStorage.setItem('kkBoardToken', state.token);
  localStorage.setItem('kkBoardRepo', JSON.stringify(state.repo));

  try {
    await github().request(`/repos/${state.repo.owner}/${state.repo.name}`);
    state.connected = true;
    nodes.connectDialog.close();
    toast('Connected');
    render();
  } catch (error) {
    state.connected = false;
    toast(error.message);
    render();
  }
}

function disconnect() {
  state.connected = false;
  state.token = '';
  sessionStorage.removeItem('kkBoardToken');
  toast('Disconnected');
  render();
}

async function syncFromGitHub() {
  try {
    const api = github();
    const manifest = await api.readText(state.repo.manifestPath);
    const inventory = await api.readText(state.repo.inventoryPath);
    files = parseAssignment(manifest, 'ARCHIVE_FILES').map(normalizeAsset);
    meta = normalizeMeta(parseAssignment(inventory, 'ARCHIVE_META'));
    state.changes = [];
    clearDraft();
    state.connected = Boolean(state.token);
    toast('Pulled latest');
    render();
  } catch (error) {
    toast(error.message);
  }
}

function parseAssignment(source, name) {
  const match = source.match(new RegExp(`window\\.${name}\\s*=\\s*([\\s\\S]*);\\s*$`));
  if (!match) throw new Error(`Could not read ${name}`);
  return JSON.parse(match[1]);
}

async function publishChanges() {
  if (!state.changes.length) return;
  if (!state.token) {
    openConnect();
    toast('Login first');
    return;
  }

  nodes.publishButton.disabled = true;
  try {
    const api = github();
    for (const change of state.changes.filter(item => item.type === 'folder-create')) {
      await api.putBase64(`${state.repo.assetRoot}/${change.folder}/.gitkeep`, '', change.label);
    }
    for (const change of state.changes.filter(item => item.type === 'upload')) {
      const blob = await readUploadBlob(change.blobKey);
      if (!blob) throw new Error(`${change.path} is missing from this browser`);
      await api.putBase64(change.href, await blobToBase64(blob), change.label);
    }
    for (const change of state.changes.filter(item => item.type === 'move')) {
      const content = await api.readFileBase64(change.oldHref);
      await api.putBase64(change.newHref, content, change.label);
      await api.deletePath(change.oldHref, `Remove ${change.oldPath}`);
    }
    for (const change of state.changes.filter(item => item.type === 'delete')) {
      await api.deletePath(change.href, change.label);
    }
    await api.putText(state.repo.manifestPath, manifestSource(), 'Update KK asset board');
    await api.putText(state.repo.inventoryPath, inventorySource(), 'Update KK folder board');
    files.forEach(asset => {
      asset.draft = false;
    });
    state.changes = [];
    state.connected = true;
    saveDraft();
    toast('Published to GitHub');
  } catch (error) {
    toast(error.message);
  } finally {
    render();
  }
}

function manifestSource() {
  return `window.ARCHIVE_FILES = ${JSON.stringify(files.map(cleanAssetForSave), null, 2)};\n`;
}

function inventorySource() {
  return `window.ARCHIVE_META = ${JSON.stringify(meta, null, 2)};\n`;
}

function cleanAssetForSave(asset) {
  return {
    id: asset.id,
    name: asset.name,
    path: asset.path,
    folder: asset.folder,
    year: asset.year,
    extension: asset.extension,
    category: asset.category,
    size: asset.size,
    modified: asset.modified,
    href: asset.href,
    ...(asset.preview ? { preview: asset.preview } : {}),
    status: asset.status,
    owner: asset.owner,
    tags: asset.tags,
    notes: asset.notes
  };
}

function cleanAssetForDraft(asset) {
  return {
    ...cleanAssetForSave(asset),
    ...(asset.blobKey ? { blobKey: asset.blobKey } : {}),
    ...(asset.draft ? { draft: true } : {})
  };
}

function github() {
  const apiBase = 'https://api.github.com';
  const contentUrl = path => `/repos/${state.repo.owner}/${state.repo.name}/contents/${encodePath(path)}`;
  const headers = () => ({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
  });

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) }
    });
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        message = body.message || message;
      } catch {
        // Keep HTTP message.
      }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function getContent(path) {
    try {
      return await request(`${contentUrl(path)}?ref=${encodeURIComponent(state.repo.branch)}`);
    } catch (error) {
      if (error.message.includes('Not Found')) return null;
      throw error;
    }
  }

  async function putBase64(path, content, message) {
    const current = await getContent(path);
    return request(contentUrl(path), {
      method: 'PUT',
      body: JSON.stringify({
        message,
        branch: state.repo.branch,
        content,
        ...(current?.sha ? { sha: current.sha } : {})
      })
    });
  }

  async function putText(path, text, message) {
    return putBase64(path, textToBase64(text), message);
  }

  async function readText(path) {
    const item = await getContent(path);
    if (!item) throw new Error(`${path} not found`);
    if (item.content) return base64ToText(item.content);
    const response = await fetch(item.download_url, { headers: headers() });
    if (!response.ok) throw new Error(`Could not read ${path}`);
    return response.text();
  }

  async function readFileBase64(path) {
    const item = await getContent(path);
    if (!item) throw new Error(`${path} not found`);
    if (item.content) return item.content.replace(/\s/g, '');
    const response = await fetch(item.download_url, { headers: headers() });
    if (!response.ok) throw new Error(`Could not read ${path}`);
    return arrayBufferToBase64(await response.arrayBuffer());
  }

  async function deletePath(path, message) {
    const current = await getContent(path);
    if (!current?.sha) return null;
    return request(contentUrl(path), {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        branch: state.repo.branch,
        sha: current.sha
      })
    });
  }

  return { request, putBase64, putText, readText, readFileBase64, deletePath };
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function textToBase64(text) {
  return arrayBufferToBase64(new TextEncoder().encode(text).buffer);
}

function base64ToText(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function blobToBase64(blob) {
  return arrayBufferToBase64(await blob.arrayBuffer());
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function openConnect() {
  nodes.repoOwner.value = state.repo.owner;
  nodes.repoName.value = state.repo.name;
  nodes.repoBranch.value = state.repo.branch;
  nodes.repoToken.value = state.token;
  nodes.connectDialog.showModal();
}

function toast(message) {
  nodes.toast.textContent = message;
  nodes.toast.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => nodes.toast.classList.remove('is-visible'), 2600);
}

nodes.searchInput.addEventListener('input', event => {
  state.search = event.target.value;
  renderBoard();
});

nodes.typeFilter.addEventListener('change', event => {
  state.typeFilter = event.target.value;
  renderBoard();
});

nodes.addFilesButton.addEventListener('click', () => nodes.fileInput.click());
nodes.dropPanelButton.addEventListener('click', () => nodes.fileInput.click());
nodes.fileInput.addEventListener('change', event => {
  void addFiles(event.target.files, '');
  event.target.value = '';
});
nodes.dropPanel.addEventListener('dragover', event => {
  if (!hasFileDrag(event.dataTransfer)) return;
  event.preventDefault();
  nodes.dropPanel.classList.add('is-over');
});
nodes.dropPanel.addEventListener('dragleave', () => nodes.dropPanel.classList.remove('is-over'));
nodes.dropPanel.addEventListener('drop', event => {
  if (!event.dataTransfer?.files?.length) return;
  event.preventDefault();
  event.stopPropagation();
  nodes.dropPanel.classList.remove('is-over');
  document.body.classList.remove('is-file-drag');
  void addFiles(event.dataTransfer.files, '');
});
nodes.newFolderButton.addEventListener('click', () => nodes.folderDialog.showModal());
nodes.folderForm.addEventListener('submit', createFolder);
nodes.connectButton.addEventListener('click', openConnect);
nodes.connectForm.addEventListener('submit', connect);
nodes.disconnectButton.addEventListener('click', disconnect);
nodes.syncButton.addEventListener('click', syncFromGitHub);
nodes.publishButton.addEventListener('click', publishChanges);
nodes.editForm.addEventListener('submit', saveEdit);
nodes.deleteAssetButton.addEventListener('click', deleteEditingAsset);

document.addEventListener('dragover', event => {
  if (!hasFileDrag(event.dataTransfer)) return;
  event.preventDefault();
  document.body.classList.add('is-file-drag');
});

document.addEventListener('dragleave', event => {
  if (event.target === document.body || event.target === document.documentElement) {
    document.body.classList.remove('is-file-drag');
  }
});

document.addEventListener('drop', event => {
  if (!event.dataTransfer?.files?.length) return;
  event.preventDefault();
  document.body.classList.remove('is-file-drag');
  void addFiles(event.dataTransfer.files, '');
});

if (state.token) state.connected = true;

render();
void hydrateLocalAssets();
