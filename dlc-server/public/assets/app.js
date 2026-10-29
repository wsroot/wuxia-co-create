/**
 * 藏经阁 · catalog browser (vanilla)
 * GET /catalog.json · GET /health — read-only
 * Kind tabs + optional tag chips from catalog union
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const TAG_LABELS = {
    talisman: '符',
    pill: '丹',
    skill: '外功',
    neigong: '内功',
    weapon: '兵刃',
    material: '材料',
    armor: '防具',
    enemy: '敌寇',
    stage: '关隘',
    affix: '词缀',
    'menpai-bundle': '门派束',
  };

  const el = {
    status: $('#status'),
    statusText: $('#status .status-text'),
    statusDot: $('#status .dot'),
    meta: $('#meta'),
    grid: $('#grid'),
    empty: $('#empty'),
    error: $('#error'),
    errorDetail: $('#error-detail'),
    retry: $('#retry'),
    tagChips: $('#tag-chips'),
    drawer: $('#drawer'),
    backdrop: $('#drawer-backdrop'),
    drawerClose: $('#drawer-close'),
    drawerKind: $('#drawer-kind'),
    drawerTitle: $('#drawer-title'),
    drawerVer: $('#drawer-ver'),
    drawerDesc: $('#drawer-desc'),
    drawerTags: $('#drawer-tags'),
    drawerId: $('#drawer-id'),
    drawerSize: $('#drawer-size'),
    drawerMd5: $('#drawer-md5'),
    drawerBuiltin: $('#drawer-builtin'),
    linkContent: $('#link-content'),
    linkDownload: $('#link-download'),
  };

  let packs = [];
  let filter = 'all';
  let tagFilter = null; // string | null

  function formatSize(n) {
    const b = Number(n) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  }

  function kindLabel(kind) {
    return kind === 'menpai' ? '门派' : '内容卷';
  }

  function tagLabel(tag) {
    return TAG_LABELS[tag] || tag;
  }

  function packTags(pkg) {
    return Array.isArray(pkg.tags) ? pkg.tags.filter((t) => typeof t === 'string' && t) : [];
  }

  function setStatus(state, text) {
    el.statusDot.className = `dot ${state}`;
    el.statusText.textContent = text;
  }

  function closeDrawer() {
    el.drawer.hidden = true;
    el.backdrop.hidden = true;
    el.drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderTagPills(container, tags, { interactive } = {}) {
    container.innerHTML = '';
    if (!tags.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    for (const tag of tags) {
      const span = document.createElement(interactive ? 'button' : 'span');
      if (interactive) {
        span.type = 'button';
        span.className = `tag-chip${tagFilter === tag ? ' active' : ''}`;
        span.dataset.tag = tag;
        span.setAttribute('aria-pressed', tagFilter === tag ? 'true' : 'false');
      } else {
        span.className = 'tag-pill';
      }
      span.textContent = tagLabel(tag);
      span.title = tag;
      container.append(span);
    }
  }

  function openDrawer(pkg) {
    el.drawerKind.textContent = kindLabel(pkg.kind);
    el.drawerTitle.textContent = pkg.name || pkg.id;
    el.drawerVer.textContent = `卷 ${pkg.version || '—'}${pkg.builtin ? ' · 山门旧册' : ' · 馆藏卷'}`;
    el.drawerDesc.textContent = pkg.description || '（此卷未留跋语）';
    el.drawerId.textContent = pkg.id || '—';
    el.drawerSize.textContent = formatSize(pkg.size);
    el.drawerMd5.textContent = pkg.md5 || '—';
    el.drawerBuiltin.textContent = pkg.builtin ? '游戏内置亦可载' : '仅藏经阁';
    renderTagPills(el.drawerTags, packTags(pkg));

    const contentHref = pkg.content || `/packages/${encodeURIComponent(pkg.id)}/content.json`;
    const dlHref = pkg.download || `/dist-packages/${encodeURIComponent(pkg.id)}.tgz`;
    el.linkContent.href = contentHref;
    el.linkDownload.href = dlHref;
    el.linkDownload.setAttribute('download', `${pkg.id}.tgz`);

    el.drawer.hidden = false;
    el.backdrop.hidden = false;
    el.drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    el.drawerClose.focus();
  }

  function rebuildTagChips() {
    if (!el.tagChips) return;
    const union = new Set();
    for (const p of packs) for (const t of packTags(p)) union.add(t);
    const tags = [...union].sort((a, b) => a.localeCompare(b));
    el.tagChips.innerHTML = '';
    if (!tags.length) {
      el.tagChips.hidden = true;
      return;
    }
    el.tagChips.hidden = false;

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `tag-chip${tagFilter == null ? ' active' : ''}`;
    allBtn.dataset.tag = '';
    allBtn.textContent = '诸类';
    allBtn.setAttribute('aria-pressed', tagFilter == null ? 'true' : 'false');
    el.tagChips.append(allBtn);

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tag-chip${tagFilter === tag ? ' active' : ''}`;
      btn.dataset.tag = tag;
      btn.textContent = tagLabel(tag);
      btn.title = tag;
      btn.setAttribute('aria-pressed', tagFilter === tag ? 'true' : 'false');
      el.tagChips.append(btn);
    }
  }

  function filteredList() {
    let list = filter === 'all' ? packs.slice() : packs.filter((p) => p.kind === filter);
    if (tagFilter) {
      list = list.filter((p) => packTags(p).includes(tagFilter));
    }
    return list;
  }

  function render() {
    const list = filteredList();

    el.grid.innerHTML = '';
    el.empty.hidden = list.length > 0;
    el.error.hidden = true;

    for (const pkg of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `card kind-${pkg.kind === 'menpai' ? 'menpai' : 'pack'}`;
      btn.setAttribute('aria-label', `翻开 ${pkg.name || pkg.id}`);

      const top = document.createElement('div');
      top.className = 'card-top';

      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = pkg.name || pkg.id;

      const badge = document.createElement('span');
      badge.className = `badge ${pkg.kind === 'menpai' ? 'menpai' : 'pack'}`;
      badge.textContent = kindLabel(pkg.kind);

      top.append(name, badge);
      if (pkg.builtin) {
        const b = document.createElement('span');
        b.className = 'badge builtin';
        b.textContent = '内置';
        top.append(b);
      }

      const ver = document.createElement('div');
      ver.className = 'card-ver';
      ver.textContent = `卷 ${pkg.version || '—'}`;

      const desc = document.createElement('p');
      desc.className = 'card-desc';
      desc.textContent = pkg.description || '';

      const tagsRow = document.createElement('div');
      tagsRow.className = 'card-tags';
      const tags = packTags(pkg);
      if (tags.length) {
        for (const tag of tags) {
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.textContent = tagLabel(tag);
          pill.title = tag;
          tagsRow.append(pill);
        }
      }

      const foot = document.createElement('div');
      foot.className = 'card-foot';
      foot.innerHTML = `<span>${formatSize(pkg.size)}</span><span class="card-open">展卷 ›</span>`;

      btn.append(top, ver, desc);
      if (tags.length) btn.append(tagsRow);
      btn.append(foot);
      btn.addEventListener('click', () => openDrawer(pkg));
      el.grid.append(btn);
    }

    el.meta.hidden = packs.length === 0;
    if (packs.length) {
      const menpai = packs.filter((p) => p.kind === 'menpai').length;
      const packN = packs.filter((p) => p.kind === 'pack').length;
      const tagBit = tagFilter ? ` · 标「${tagLabel(tagFilter)}」` : '';
      el.meta.textContent = `阁中共 ${packs.length} 卷 · 门派 ${menpai} · 内容卷 ${packN} · 现览 ${list.length}${tagBit}`;
    }
  }

  async function loadHealth() {
    try {
      const res = await fetch('/health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`health ${res.status}`);
      const data = await res.json();
      if (data && data.ok) {
        setStatus('ok', `阁门洞开 · 港 ${data.port ?? '—'} · 馆务安好`);
        return;
      }
      setStatus('bad', '阁门有异 · 健康回报异常');
    } catch {
      setStatus('bad', '阁门难叩 · 健康检查未通');
    }
  }

  async function loadCatalog() {
    el.error.hidden = true;
    el.empty.hidden = true;
    el.grid.innerHTML = '';
    try {
      const res = await fetch('/catalog.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.packages)) throw new Error('catalog shape');
      packs = data.packages.slice().sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'menpai' ? -1 : 1;
        return String(a.name || a.id).localeCompare(String(b.name || b.id), 'zh');
      });
      // Drop tag filter if that tag vanished
      if (tagFilter) {
        const still = packs.some((p) => packTags(p).includes(tagFilter));
        if (!still) tagFilter = null;
      }
      rebuildTagChips();
      render();
    } catch (err) {
      packs = [];
      el.meta.hidden = true;
      if (el.tagChips) el.tagChips.hidden = true;
      el.error.hidden = false;
      el.errorDetail.textContent =
        err && err.message
          ? `未能取得 catalog.json（${err.message}）。请确认馆址在线，或稍后再试。`
          : '未能取得 catalog.json。请确认馆址在线，或稍后再试。';
      setStatus('bad', '册簿未至 · 目录拉取失败');
    }
  }

  // Kind tabs
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      filter = tab.dataset.filter || 'all';
      document.querySelectorAll('.tab').forEach((t) => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      render();
    });
  });

  // Tag chips (event delegation)
  el.tagChips?.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-chip');
    if (!btn) return;
    const tag = btn.dataset.tag || '';
    tagFilter = tag || null;
    rebuildTagChips();
    render();
  });

  el.retry?.addEventListener('click', () => {
    setStatus('pending', '正探阁门…');
    loadHealth();
    loadCatalog();
  });

  el.drawerClose?.addEventListener('click', closeDrawer);
  el.backdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.drawer.hidden) closeDrawer();
  });

  loadHealth();
  loadCatalog();
})();
