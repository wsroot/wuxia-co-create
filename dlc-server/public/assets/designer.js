/**
 * 藏经阁 · 设计台
 * 白名单积木拼装 content 卷 → 导出 pack.json + content.json
 * 无任意可执行脚本注入游戏；未知 kind 不出现。
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const TOKEN_KEY = 'dlc_designer_upload_token';
  const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

  /** @type {any} */
  let SCHEMA = null;

  const state = {
    pack: {
      id: 'my-pack',
      kind: 'pack',
      name: '未名卷',
      version: '0.1.0',
      description: '设计台试笔。',
      tags: [],
      builtin: false,
    },
    content: {
      attacks: [],
      poses: [],
      fxRecipes: [],
      projectiles: [],
      volleys: [],
      sheets: [],
      sfx: [],
      backdrops: [],
      combatStyles: [],
      weaponLooks: [],
      animRecipes: [],
      talismanScripts: [],
      silhouettes: [],
      behaviors: [],
      colliders: [],
      bossMoves: [],
      bossKits: [],
      eliteMods: [],
      fragments: [],
      titles: [],
      materials: [],
      armorSets: [],
      armorPieces: [],
      wepAffixes: [],
      affixes: [],
      pills: [],
      neigong: [],
      weapons: [],
      skills: [],
      talismans: [],
      enemies: [],
      stages: [],
      // Act2：嵌套 { pools, beats }（非 Catalog 数组；与 applyContent 同构）
      acts: { pools: [], beats: [] },
    },
    sel: {
      weaponLooks: 0,
      animRecipes: 0,
      talismanScripts: 0,
      silhouettes: 0,
      behaviors: 0,
    },
    gpKind: 'weapons',
    gpSel: 0,
    stageSel: 0,
    actPoolSel: 0,
    actBeatSel: 0,
  };

  /** @type {Record<string, any>|null} */
  let STAGE_SKELS = null;

  const LIST_KEYS = {
    weaponLooks: { listKey: 'parts', schemaKey: 'parts', itemLabel: '部件' },
    animRecipes: { listKey: 'steps', schemaKey: 'steps', itemLabel: '步骤' },
    talismanScripts: { listKey: 'steps', schemaKey: 'steps', itemLabel: '步骤' },
    silhouettes: { listKey: 'parts', schemaKey: 'parts', itemLabel: '部件' },
    behaviors: { listKey: 'steps', schemaKey: 'steps', itemLabel: '步骤' },
  };

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function getAt(obj, path) {
    if (!path.includes('.')) return obj[path];
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function setAt(obj, path, value) {
    if (!path.includes('.')) {
      if (value === undefined) delete obj[path];
      else obj[path] = value;
      return;
    }
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] == null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
      cur = cur[p];
    }
    const last = parts[parts.length - 1];
    if (value === undefined) delete cur[last];
    else cur[last] = value;
  }

  function parseMaterialMap(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    const out = {};
    String(raw || '')
      .split(/[,，]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const m = pair.match(/^([a-zA-Z_][\w]*)\s*[:=]\s*(\d+)$/);
        if (m) out[m[1]] = Number(m[2]);
      });
    return Object.keys(out).length ? out : undefined;
  }

  function formatMaterialMap(obj) {
    if (!obj || typeof obj !== 'object') return '';
    return Object.entries(obj).map(([k, v]) => k + ':' + v).join(', ');
  }

  function emptyDef(section) {
    if (section === 'weaponLooks') {
      return { id: `look_${Date.now().toString(36).slice(-5)}`, label: '', baseShape: 'sword', parts: [] };
    }
    if (section === 'animRecipes') {
      return { id: `anim_${Date.now().toString(36).slice(-5)}`, label: '', steps: [] };
    }
    if (section === 'talismanScripts') {
      return { id: `tscript_${Date.now().toString(36).slice(-5)}`, label: '', steps: [], anim: '' };
    }
    if (section === 'silhouettes') {
      return { id: `sil_${Date.now().toString(36).slice(-5)}`, label: '', body: 'spear', baseRig: 'spear', parts: [] };
    }
    if (section === 'behaviors') {
      return { id: `beh_${Date.now().toString(36).slice(-5)}`, label: '', body: 'spear', steps: [] };
    }
    if (section === 'colliders') {
      return { id: `col_${Date.now().toString(36).slice(-5)}`, label: '', w: 32, h: 82 };
    }
    if (section === 'bossMoves') {
      return {
        id: `bm_${Date.now().toString(36).slice(-5)}`,
        kind: 'slam',
        label: '试笔震地',
        radius: 160,
        damage: 18,
      };
    }
    if (section === 'bossKits') {
      return {
        id: `bk_${Date.now().toString(36).slice(-5)}`,
        close: [
          { move: 'claw', weight: 4 },
          { move: 'slam', weight: 2 },
          { move: 'roar', weight: 1.4 },
        ],
        far: [
          { move: 'fireball', weight: 2 },
          { move: 'dive', weight: 2 },
          { move: 'walk', weight: 2 },
        ],
      };
    }
    return { id: `item_${Date.now().toString(36).slice(-5)}` };
  }

  function emptyGameplay(kind) {
    const id = `${kind.slice(0, 3)}_${Date.now().toString(36).slice(-5)}`;
    if (kind === 'combatStyles') {
      return {
        id: `cs_${Date.now().toString(36).slice(-5)}`,
        groundKeys: ['slash1', 'slash2', 'slash3', 'finisher'],
        branches: {
          dash: 'dashKick',
          groundUp: 'launcher',
          groundDown: 'sweep',
          airDown: 'plunge',
          airUp: 'rising',
          airNeutral: ['airA', 'airB'],
          throw: 'throw',
        },
        noChainOpen: ['finisher', 'throw', 'plunge'],
        plungeWaveKey: 'plungeWave',
      };
    }
    if (kind === 'weapons') {
      const lookFallback = (state.content.weaponLooks[0] && state.content.weaponLooks[0].id) || '';
      return {
        id,
        name: '无名兵刃',
        lore: '设计台试笔之刃。',
        tip: '试笔兵刃',
        unlock: { type: 'blueprint', hint: '设计台试笔' },
        damage: 1, speed: 1, reach: 1, poise: 1, rage: 1, airHover: 1,
        weight: 'medium',
        category: 'blade',
        affinities: ['juggle'],
        affinityBonus: 0.1,
        blade: '#e9eef7', trail: '#ff2040', edge: '#ff4a66',
        length: 56,
        shape: 'sword',
        quality: 'fan',
        tier: 1,
        lookId: lookFallback,
        feel: { boxTune: {} },
        craft: { materials: { iron: 1 }, fee: 10 },
      };
    }
    if (kind === 'skills') {
      return {
        id,
        name: '无名外功',
        fogName: '武学·??',
        kind: 'active',
        track: 'combat',
        lore: '设计台试笔外功。',
        tip: '挂既有攻击盒试斩',
        profHint: '施放本招',
        meditateCost: {},
        fee: 0,
        quality: 'fan',
        weaponGate: 'any',
        neiliCost: 20,
        castKind: 'attack',
        attackKey: 'slash1',
        commandSeq: ['D', 'F'],
        commandLabel: '↓→攻',
        hudHint: '试笔↓→J',
        touchPriority: 40,
      };
    }
    if (kind === 'talismans') {
      const scriptFallback = (state.content.talismanScripts[0] && state.content.talismanScripts[0].id) || '';
      return {
        id,
        name: '无名符',
        fogName: '灵符·??',
        lore: '设计台试笔之符。',
        tip: '出征：试笔符效',
        color: '#c8a060',
        cost: { cinnabar: 1 },
        fee: 8,
        stockCap: 2,
        runCharges: 1,
        scriptId: scriptFallback,
        anim: '',
        quality: 'fan',
        grade: 'xia',
        icon: '',
      };
    }
    if (kind === 'attacks') {
      const aid = `atk_${Date.now().toString(36).slice(-5)}`;
      return {
        id: aid,
        name: aid,
        startup: 24,
        active: 5,
        recovery: 28,
        box: { x: 4, y: -96, w: 72, h: 90 },
        damage: 12,
        kbX: 5,
        kbY: -2,
        hitstun: 20,
        hitstop: 6,
        shake: 4,
        parryable: true,
        swing: 'slash',
      };
    }
    if (kind === 'fxRecipes') {
      const emitters = (SCHEMA && SCHEMA.fxEmitters) || ['flare', 'ring', 'spark', 'qi', 'fire', 'dust', 'swordQi'];
      return {
        id: `fx_${Date.now().toString(36).slice(-5)}`,
        emitter: emitters[0] || 'flare',
        color: '#a0b8e0',
        size: 48,
        life: 16,
      };
    }
    if (kind === 'poses') {
      const templates = (SCHEMA && SCHEMA.corePoseTemplates) || {};
      const base = templates.slash1 || {
        wind: { y: 4, lean: -0.08, head: 0, rot: 0, ft: 0.5, fk: -0.5, bt: -0.35, bk: -0.3, fa: 2.75, fe: 0.5, ba: -0.6, be: 0.6, w: 0.4 },
        strike: { y: 7, lean: 0.38, head: -0.1, rot: 0, ft: 0.8, fk: -0.75, bt: -0.6, bk: -0.2, fa: 1.0, fe: 0.15, ba: -1.0, be: 0.4, w: 0.15 },
        rec: { y: 6, lean: 0.32, head: 0, rot: 0, ft: 0.75, fk: -0.7, bt: -0.55, bk: -0.2, fa: 0.4, fe: 0.2, ba: -0.8, be: 0.5, w: 0.2 },
      };
      const clone = deepClone(base);
      return {
        id: `pose_${Date.now().toString(36).slice(-5)}`,
        wind: clone.wind,
        strike: clone.strike,
        rec: clone.rec,
      };
    }
    if (kind === 'projectiles') {
      const kinds = (SCHEMA && SCHEMA.projDrawKinds) || ['arrow', 'fireball'];
      return {
        id: `prj_${Date.now().toString(36).slice(-5)}`,
        drawKind: kinds[0] || 'arrow',
        hitW: 24,
        hitH: 8,
        life: 240,
        hitSfx: 'arrow',
      };
    }
    if (kind === 'volleys') {
      const styles = (SCHEMA && SCHEMA.volleyStyles) || ['skySword', 'thunder', 'waterPulse'];
      return {
        id: `vol_${Date.now().toString(36).slice(-5)}`,
        style: styles.includes('thunder') ? 'thunder' : (styles[0] || 'skySword'),
        defaultCount: 4,
        defaultInterval: 12,
        defaultSpread: 200,
        color: '#ffe080',
      };
    }
    if (kind === 'sheets') {
      return {
        id: `sht_${Date.now().toString(36).slice(-5)}`,
        src: './art/weapons/blade_ink.png',
        frameW: 64,
        frameH: 32,
        frames: 3,
        maxBytes: 512000,
      };
    }
    if (kind === 'sfx') {
      const synths = (SCHEMA && SCHEMA.coreSynthIds) || ['slash'];
      return {
        id: `sfx_${Date.now().toString(36).slice(-5)}`,
        synth: synths.includes('slash') ? 'slash' : (synths[0] || 'slash'),
      };
    }
    if (kind === 'backdrops') {
      const themes = (SCHEMA && SCHEMA.backdropThemeIds) || ['night', 'dock', 'ash', 'eclipse'];
      return {
        id: `bd_${Date.now().toString(36).slice(-5)}`,
        theme: themes.includes('eclipse') ? 'eclipse' : (themes[0] || 'night'),
        label: '试笔幕氛围',
      };
    }
    if (kind === 'colliders') {
      return { id: `col_${Date.now().toString(36).slice(-5)}`, label: '试笔盒', w: 32, h: 82 };
    }
    if (kind === 'bossMoves') {
      const kinds = (SCHEMA && SCHEMA.bossMoveKinds) || ['claw','charge','fireball','dive','roar','walk','slam','sweep','summonAdds','inkNova'];
      return {
        id: `bm_${Date.now().toString(36).slice(-5)}`,
        kind: kinds.includes('slam') ? 'slam' : (kinds[0] || 'claw'),
        label: '试笔震地',
        radius: 160,
        damage: 18,
        hitstop: 10,
      };
    }
    if (kind === 'bossKits') {
      return {
        id: `bk_${Date.now().toString(36).slice(-5)}`,
        close: [
          { move: 'claw', weight: 4 },
          { move: 'slam', weight: 2 },
          { move: 'roar', weight: 1.4 },
        ],
        far: [
          { move: 'fireball', weight: 2 },
          { move: 'dive', weight: 2 },
          { move: 'charge', weight: 2 },
          { move: 'walk', weight: 2 },
        ],
      };
    }
    if (kind === 'eliteMods') {
      return {
        id: `em_${Date.now().toString(36).slice(-5)}`,
        name: '试笔铜皮',
        color: '#c8a878',
        tag: '铜皮',
        dmgTakenMul: 0.75,
      };
    }
    if (kind === 'fragments') {
      const tags = (SCHEMA && SCHEMA.fragmentTags) || ['qi', 'body', 'speed', 'sustain', 'curse'];
      return {
        id: `fr_${Date.now().toString(36).slice(-5)}`,
        name: '试笔残页',
        fogName: '残页·??',
        desc: '设计台试笔残页',
        color: '#ff9080',
        tag: tags.includes('qi') ? 'qi' : (tags[0] || 'qi'),
        skillDmgMul: 1.1,
      };
    }
    if (kind === 'titles') {
      return {
        id: `ti_${Date.now().toString(36).slice(-5)}`,
        name: '试笔称号',
        desc: '设计台试笔达成',
        qol: '开局丹药 +1',
        startPotions: 1,
      };
    }
    if (kind === 'materials') {
      return {
        id: `mat_${Date.now().toString(36).slice(-5)}`,
        name: '试笔材料',
        lore: '设计台试笔材料',
        weight: 10,
      };
    }
    if (kind === 'armorSets') {
      const slots = (SCHEMA && SCHEMA.armorSlots) || ['head', 'body', 'arms', 'legs', 'neck', 'ring', 'waist'];
      return {
        id: `as_${Date.now().toString(36).slice(-5)}`,
        fogName: '套装·??',
        name: '试笔套装',
        lore: '设计台试笔套装',
        slots: slots.slice(0, 4),
        weight: 10,
        two: { def: 0.02 },
        full: { def: 0.04, atk: 0.01 },
        twoTip: '减伤微升',
        fullTip: '减伤再升 · 攻击微升',
      };
    }
    if (kind === 'armorPieces') {
      const slots = (SCHEMA && SCHEMA.armorSlots) || ['head', 'body', 'arms', 'legs', 'neck', 'ring', 'waist'];
      return {
        id: `ap_${Date.now().toString(36).slice(-5)}`,
        name: '试笔单件',
        slot: slots.includes('body') ? 'body' : (slots[0] || 'body'),
        lore: '设计台试笔防具',
        base: { hp: 8, def: 1 },
        weight: 10,
        common: true,
      };
    }
    if (kind === 'wepAffixes') {
      return {
        id: `wa_${Date.now().toString(36).slice(-5)}`,
        name: '试笔词缀',
        fogName: '词缀·??',
        tip: '破韧略升',
        poiseMul: 1.1,
      };
    }
    if (kind === 'affixes') {
      return {
        id: `af_${Date.now().toString(36).slice(-5)}`,
        name: '试笔慢毒',
        fogName: '??·雾',
        desc: '毒雾更缓，蚀骨略轻',
        color: '#70c060',
        primaryWeight: 3,
        secondaryWeight: 1,
        dotPeriod: 120,
        dotDamage: 1,
        dotFloatEvery: 2,
      };
    }
    if (kind === 'pills') {
      return {
        id: `pil_${Date.now().toString(36).slice(-5)}`,
        name: '试笔回血丹',
        lore: '设计台试笔丹药。',
        tip: '出征：回复生命',
        cost: { herb: 2, cinnabar: 1 },
        fee: 8,
        carryCap: 5,
        quality: 'fan',
        grade: 'xia',
        sortie: true,
        effect: {
          heal: 40,
          healWithFrag: true,
          floatText: '试笔回血',
          floatColor: '#ff6a7a',
          sfx: 'potion',
        },
      };
    }
    if (kind === 'neigong') {
      return {
        id: `ng_${Date.now().toString(36).slice(-5)}`,
        name: '试笔混元',
        lore: '设计台试笔内功。',
        tip: '武功与气势均衡提升',
        signature: '回内：内力回复平稳 · 满级处决微升',
        style: '均衡',
        meditateCost: { cinnabar: 2, herb: 2 },
        fee: 22,
        quality: 'fan',
        effects: {
          damageBonus: [0.06, 0.09, 0.12, 0.16, 0.20],
          rageBonus: [0.08, 0.11, 0.14, 0.18, 0.22],
          defBonus: [0.02, 0.03, 0.04, 0.05, 0.06],
          neiliRegenMul: [1.0, 1.05, 1.1, 1.15, 1.2],
          executeMulBonus: 0.1,
        },
      };
    }
    if (kind === 'enemies') {
      return {
        id, name: '无名敌', hp: 55,
        silhouetteId: 'spear', behaviorId: 'spear', colliderId: 'spear',
        dropChance: 0.2, eliteEligible: true,
      };
    }
    return { id };
  }

  /** Recipe bag; talismanScripts reuses scriptSteps whitelist. */
  function schemaBagFor(section) {
    const bag = SCHEMA && SCHEMA[section];
    if (!bag) return null;
    if (bag.useStepsFrom && SCHEMA[bag.useStepsFrom]) {
      const stepsBag = SCHEMA[bag.useStepsFrom];
      return {
        label: bag.label || stepsBag.label,
        note: bag.note || stepsBag.note,
        defFields: bag.defFields,
        parts: stepsBag.parts,
        steps: stepsBag.steps,
      };
    }
    return bag;
  }

  function kindMeta(section, kind) {
    const bag = schemaBagFor(section);
    if (!bag) return null;
    const list = bag.parts || bag.steps || [];
    return list.find((x) => x.kind === kind) || null;
  }


  function castFxKindList() {
    const whitelist = (SCHEMA && SCHEMA.skills && SCHEMA.skills.castFx && SCHEMA.skills.castFx.kinds)
      || ['wait', 'fx', 'shake', 'hitstop', 'flash', 'sfx', 'damageBox', 'damageDonut', 'zone', 'pull', 'root', 'multihit'];
    const steps = (SCHEMA && SCHEMA.scriptSteps && SCHEMA.scriptSteps.steps) || [];
    const allow = new Set(whitelist);
    return steps.filter((st) => allow.has(st.kind));
  }

  function castFxKindMeta(kind) {
    return castFxKindList().find((x) => x.kind === kind) || null;
  }

  function defaultCastFxStep(kind) {
    const step = { kind };
    if (kind === 'wait') step.frames = 4;
    if (kind === 'sfx') step.id = 'slash';
    if (kind === 'flash') { step.color = '#ffe0a0'; step.a = 0.12; }
    if (kind === 'hitstop') step.frames = 3;
    if (kind === 'shake') { step.amp = 2; step.frames = 5; }
    if (kind === 'fx') { step.preset = 'flare'; step.size = 48; step.color = '#e8d0a0'; }
    if (kind === 'damageBox') { step.w = 80; step.h = 50; step.damage = 12; step.ox = 50; }
    if (kind === 'damageDonut') { step.rInner = 40; step.rOuter = 120; step.damage = 10; }
    if (kind === 'zone') { step.shape = 'circle'; step.duration = 120; step.radius = 70; step.tickDamage = 2; }
    if (kind === 'pull') { step.radius = 140; step.strength = 2.5; step.frames = 20; }
    if (kind === 'root') { step.duration = 60; step.radius = 120; }
    if (kind === 'multihit') { step.times = 3; step.gapFrames = 6; step.step = { kind: 'damageBox', w: 60, h: 40, damage: 6, ox: 40 }; }
    return step;
  }

  /** 外功详情区嵌套的轻量 castFx 步骤列表（非完整符箓编辑器） */
  function renderSkillCastFx(def, root) {
    if (!Array.isArray(def.castFx)) def.castFx = [];
    const wrap = document.createElement('div');
    wrap.className = 'castfx-editor';
    wrap.style.cssText = 'margin-top:1rem;grid-column:1/-1;';

    const title = document.createElement('h3');
    title.style.cssText = 'margin:0 0 0.35rem;font-size:0.85rem;letter-spacing:0.18em;color:var(--moon-soft)';
    title.textContent = '施放特效 castFx（轻量 ScriptStep）';
    wrap.append(title);

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.style.margin = '0 0 0.55rem';
    hint.textContent = (SCHEMA && SCHEMA.skills && SCHEMA.skills.castFx && SCHEMA.skills.castFx.note)
      || '白名单短步骤；与符箓同一套 ScriptStep，不做完整符编辑器。';
    wrap.append(hint);

    const addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.55rem;align-items:center;';
    const sel = document.createElement('select');
    sel.className = 'ink-select';
    for (const meta of castFxKindList()) {
      const o = document.createElement('option');
      o.value = meta.kind;
      o.textContent = `${meta.label || meta.kind}（${meta.kind}）`;
      sel.append(o);
    }
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-ink';
    addBtn.textContent = '＋ 加一步';
    addBtn.addEventListener('click', () => {
      const kind = sel.value;
      if (!castFxKindMeta(kind)) return;
      def.castFx.push(defaultCastFxStep(kind));
      renderGameplay();
      toast(`castFx 已加「${kind}」`);
    });
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn-ink danger-soft';
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', () => {
      def.castFx = [];
      renderGameplay();
      toast('已清空 castFx');
    });
    addRow.append(sel, addBtn, clearBtn);
    wrap.append(addRow);

    const stepList = document.createElement('div');
    stepList.className = 'step-list';
    if (!def.castFx.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-recipe';
      empty.textContent = '尚无 castFx · 选 kind 后点「加一步」（可选）';
      stepList.append(empty);
    }
    def.castFx.forEach((step, si) => {
      const meta = castFxKindMeta(step.kind);
      const card = document.createElement('div');
      card.className = 'step-card';
      const head = document.createElement('div');
      head.className = 'step-head';
      head.innerHTML = `<span class="step-kind">${step.kind}</span><span class="step-label">${(meta && meta.label) || ''}</span>`;
      const actions = document.createElement('div');
      actions.className = 'step-actions';
      const mkBtn = (label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', fn);
        return b;
      };
      actions.append(
        mkBtn('↑', () => {
          if (si === 0) return;
          [def.castFx[si - 1], def.castFx[si]] = [def.castFx[si], def.castFx[si - 1]];
          renderGameplay();
        }),
        mkBtn('↓', () => {
          if (si >= def.castFx.length - 1) return;
          [def.castFx[si + 1], def.castFx[si]] = [def.castFx[si], def.castFx[si + 1]];
          renderGameplay();
        }),
        mkBtn('删', () => {
          def.castFx.splice(si, 1);
          renderGameplay();
          toast('已删 castFx 步');
        }),
      );
      head.append(actions);
      card.append(head);
      if (meta && meta.fields && meta.fields.length) {
        const fields = document.createElement('div');
        fields.className = 'step-fields';
        for (const f of meta.fields) {
          fields.append(renderFieldInput(f, step, () => {
            paintPreview('gameplay', def, { gpKind: 'skills' });
            refreshExportPreview();
          }));
        }
        card.append(fields);
      } else if (!meta) {
        const warn = document.createElement('p');
        warn.className = 'hint';
        warn.textContent = `未知 kind「${step.kind}」· 导出仍保留，运行时可能拒登`;
        card.append(warn);
      }
      stepList.append(card);
    });
    wrap.append(stepList);
    root.append(wrap);
  }


  function coerceValue(type, raw, field) {
    if (type === 'number') {
      if (raw === '' || raw == null) return undefined;
      let n = Number(raw);
      if (Number.isNaN(n)) return undefined;
      if (field && field.min != null) n = Math.max(field.min, n);
      if (field && field.max != null) n = Math.min(field.max, n);
      return n;
    }
    if (type === 'boolean') return Boolean(raw);
    if (type === 'stringList') {
      if (Array.isArray(raw)) return raw;
      return String(raw || '')
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (type === 'numberList') {
      if (Array.isArray(raw)) {
        return raw.map(Number).filter((n) => !Number.isNaN(n));
      }
      return String(raw || '')
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
    }
    if (type === 'materialMap') {
      return parseMaterialMap(raw);
    }
    if (type === 'enum' && (raw === '1' || raw === '-1')) {
      return Number(raw);
    }
    if (raw === '' || raw == null) return undefined;
    return raw;
  }

  function buildContentExport() {
    const c = {};
    // 与远程 applyContent / REMOTE_DLC_INJECT 依赖序对齐（本导出子集）：
    // attacks 宜早于 skills/behaviors（attackKey）；fxRecipes 宜早于 animRecipes（recipeId）；
    // R2：projectiles 宜早于 volleys / behaviors；volleys 宜早于 talismanScripts（projectileId / volleyId）；
    // R2b：sheets/sfx 宜早于 weapons / talismanScripts（sheetId / sfx）；backdrops 宜早于 stages；
    // talismanScripts 先于 talismans；animRecipes 宜先于 skills；combatStyles/weaponLooks 宜先于 weapons；
    // silhouettes → behaviors → colliders → enemies（供 silhouetteId / behaviorId / colliderId）；
    // G2：bossMoves 宜早于 bossKits / enemies（kit 只引用 move id）。
    // D1：eliteMods / titles / fragments（与 REMOTE_DLC_INJECT 同构；summonEnemyId 软引用 enemies，宜靠后）。
    // D2：materials 宜早于 weapons/talismans（craft/cost）；armorSets 先于 armorPieces（与 remote apply 同构）；wepAffixes 瘦可同批。
    // D3：affixes（场地词缀；与 REMOTE 同构；evolveTo 软引用；affixBias 导演已读 prefer-subset·债#5）。
    // D4：pills / neigong（丹 effect / 内功 effects；cost/meditateCost 吃 materials；与 REMOTE 同构）。
    const keys = [
      'attacks',
      // X3: poses + X2 fxRecipes before animRecipes（poseId / recipeId）
      'poses',
      'fxRecipes',
      // R2b: sheets/sfx before weapons / scripts；R2 projectiles before volleys
      'sheets',
      'sfx',
      'projectiles',
      'volleys',
      'combatStyles', 'weaponLooks', 'animRecipes', 'talismanScripts', 'silhouettes', 'behaviors', 'colliders',
      'bossMoves', 'bossKits',
      // D2: materials before weapons（craft soft-ref）；armorSets before armorPieces
      'materials',
      // D4: pills / neigong after materials（cost / meditateCost soft-ref）
      'pills', 'neigong',
      'weapons', 'skills', 'talismans', 'enemies',
      'armorSets', 'armorPieces', 'wepAffixes',
      // D3: affixes（场地词缀；远程已通）
      'affixes',
      // D1: eliteMods / titles / fragments（玩法副目录；远程已通）
      'eliteMods', 'titles', 'fragments',
      // R2b: backdrops before stages（backdropTheme）
      'backdrops',
      'stages',
      // Act2: acts 嵌套 pools/beats — 见下方专用导出（非 Catalog 数组）
    ];
    for (const k of keys) {
      const arr = state.content[k];
      if (Array.isArray(arr) && arr.length) c[k] = deepClone(arr);
    }
    // Act2：content.acts = { pools?, beats? } 同构 Act1 applyContent（禁止塞进 stages）
    const acts = state.content.acts;
    if (acts && typeof acts === 'object') {
      const pools = Array.isArray(acts.pools) ? acts.pools : [];
      const beats = Array.isArray(acts.beats) ? acts.beats : [];
      if (pools.length || beats.length) {
        c.acts = {};
        if (pools.length) c.acts.pools = deepClone(pools);
        if (beats.length) c.acts.beats = deepClone(beats);
      }
    }
    return c;
  }

  function buildPackExport() {
    const p = {
      id: state.pack.id,
      kind: state.pack.kind,
      name: state.pack.name,
      version: state.pack.version,
      description: state.pack.description || '',
      builtin: Boolean(state.pack.builtin),
    };
    if (state.pack.tags && state.pack.tags.length) p.tags = [...state.pack.tags];
    return p;
  }

  function buildUploadPayload() {
    return { pack: buildPackExport(), content: buildContentExport() };
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  /* ── Meta form ─────────────────────────────────────────── */

  function renderMeta() {
    const root = $('#meta-form');
    root.innerHTML = '';

    const fields = [
      { key: 'id', label: '卷号 id', type: 'string' },
      { key: 'name', label: '卷名', type: 'string' },
      { key: 'kind', label: '类型', type: 'enum', enum: ['pack', 'menpai'] },
      { key: 'version', label: '版本', type: 'string' },
      { key: 'description', label: '跋语', type: 'string', span: 2 },
    ];

    for (const f of fields) {
      const lab = document.createElement('label');
      lab.className = `field${f.span === 2 ? ' span-2' : ''}`;
      const span = document.createElement('span');
      span.textContent = f.label;
      lab.append(span);
      let input;
      if (f.type === 'enum') {
        input = document.createElement('select');
        for (const opt of f.enum) {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt === 'menpai' ? '门派 menpai' : '内容卷 pack';
          if (state.pack[f.key] === opt) o.selected = true;
          input.append(o);
        }
      } else {
        input = document.createElement(f.key === 'description' ? 'textarea' : 'input');
        if (f.key === 'description') input.rows = 3;
        else input.type = 'text';
        input.value = state.pack[f.key] ?? '';
      }
      input.addEventListener('change', () => {
        state.pack[f.key] = input.value;
        if (f.key === 'id') refreshExportPreview();
      });
      input.addEventListener('input', () => {
        state.pack[f.key] = input.value;
      });
      lab.append(input);
      root.append(lab);
    }

    const tagLab = document.createElement('div');
    tagLab.className = 'field span-2';
    tagLab.innerHTML = '<span>标签 tags</span>';
    const row = document.createElement('div');
    row.className = 'tag-check-row';
    for (const t of SCHEMA.tags) {
      const lab = document.createElement('label');
      lab.className = 'tag-check';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = t.id;
      cb.checked = state.pack.tags.includes(t.id);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!state.pack.tags.includes(t.id)) state.pack.tags.push(t.id);
        } else {
          state.pack.tags = state.pack.tags.filter((x) => x !== t.id);
        }
      });
      lab.append(cb, document.createTextNode(t.label));
      lab.title = t.id;
      row.append(lab);
    }
    tagLab.append(row);
    root.append(tagLab);
  }

  /* ── Block tray ────────────────────────────────────────── */

  function renderTray(section) {
    const tray = $(`#tray-${section}`);
    if (!tray) return;
    const bag = schemaBagFor(section);
    if (!bag) return;
    const items = bag.parts || bag.steps || [];
    tray.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = `积木 · ${bag.label || section}`;
    tray.append(h);

    const groups = new Map();
    for (const it of items) {
      const g = it.group || '白名单';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    }
    for (const [g, list] of groups) {
      const wrap = document.createElement('div');
      wrap.className = 'tray-group';
      const title = document.createElement('div');
      title.className = 'tray-group-title';
      title.textContent = g;
      wrap.append(title);
      for (const it of list) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'block-btn';
        const icon = it.icon || (it.label || it.kind).slice(0, 1);
        const hint = it.hint || '';
        btn.innerHTML = `<span class="block-icon">${icon}</span><span class="block-text"><strong>${it.label || it.kind}</strong><em>${hint}</em></span>`;
        btn.title = hint || it.kind;
        btn.addEventListener('click', () => addBlock(section, it.kind));
        wrap.append(btn);
      }
      tray.append(wrap);
    }
  }

  function addBlock(section, kind) {
    const meta = kindMeta(section, kind);
    if (!meta) return;
    const cfg = LIST_KEYS[section];
    const list = state.content[section];
    if (!list.length) {
      list.push(emptyDef(section));
      state.sel[section] = 0;
    }
    const idx = Math.min(state.sel[section], list.length - 1);
    const def = list[idx];
    if (!Array.isArray(def[cfg.listKey])) def[cfg.listKey] = [];
    const step = { kind };
    // sensible defaults for required-ish fields
    if (kind === 'wait') step.frames = 8;
    if (kind === 'sfx') step.id = 'slash';
    if (kind === 'flash') { step.color = '#ffe0a0'; step.a = 0.12; }
    if (kind === 'hitstop') step.frames = 4;
    if (kind === 'shake') { step.amp = 3; step.frames = 6; }
    if (kind === 'tintCaster') { step.color = '#e8c070'; step.frames = 12; }
    if (kind === 'playPose' || kind === 'holdPose' || kind === 'loopPose') {
      step.poseId = 'slash1';
      if (kind !== 'playPose') step.frames = 8;
    }
    if (kind === 'bounce') step.hops = 2;
    if (kind === 'hover') step.frames = 12;
    if (kind === 'chainPose') step.poseIds = ['slash1', 'slash2'];
    if (kind === 'face') step.dir = 'player';
    if (kind === 'scale') step.value = 1;
    if (kind === 'keepDistance') {
      step.idealMin = 90; step.idealMax = 165; step.chase = 240;
    }
    if (kind === 'meleeAttack') { step.rangeMax = 160; step.attackKey = 'thrust'; }
    if (kind === 'rangedAttack') { step.projectileId = 'arrow'; step.rangeMin = 120; step.rangeMax = 320; }
    if (kind === 'spriteOverlay') step.sheetId = '';
    if (kind === 'dodge') { step.direction = 'away'; step.range = 100; step.weight = 1; }
    if (kind === 'circleStrafe') { step.radius = 130; step.speed = 1.3; step.weight = 0.7; }
    if (kind === 'flank') { step.preferBehind = true; step.weight = 0.6; }
    if (kind === 'callAlly') { step.enemyId = 'axe'; step.max = 1; step.cooldown = 180; step.weight = 0.8; }
    if (kind === 'phaseAtHp') { step.below = 0.4; step.setPhase = '残局'; }
    if (kind === 'phaseGate') { step.phase = '残局'; }
    if (kind === 'comboChain') { step.attackKeys = ['thrust', 'lunge']; step.gapFrames = 10; step.rangeMax = 180; step.weight = 1; }
    if (kind === 'retreatBurst') { step.dist = 90; step.frames = 12; step.weight = 0.6; }
    if (kind === 'taunt') { step.text = '来啊！'; step.weight = 0.4; }
    if (kind === 'idleEmote') { step.text = '……'; step.weight = 0.2; }
    if (kind === 'cloak') { step.style = 'long'; step.sway = 1; }
    if (kind === 'armorLayer') { step.slot = 'chest'; step.style = 'light'; }
    if (kind === 'ornament') { step.slot = 'waist'; step.style = 'bell'; }
    if (kind === 'faceMark') { step.style = 'scar'; }
    if (kind === 'stanceBias') { step.lean = 0.1; step.crouch = 0; }
    if (kind === 'damageBox') { step.w = 80; step.h = 50; step.damage = 12; step.ox = 50; }
    if (kind === 'damageDonut') { step.rInner = 40; step.rOuter = 120; step.damage = 10; }
    if (kind === 'zone') { step.shape = 'circle'; step.duration = 120; step.radius = 70; step.tickDamage = 2; }
    if (kind === 'pull') { step.radius = 140; step.strength = 2.5; step.frames = 20; }
    if (kind === 'root') { step.duration = 60; step.radius = 120; }
    if (kind === 'multihit') { step.times = 3; step.gapFrames = 6; step.step = { kind: 'damageRadius', rx: 60, damage: 6 }; }
    if (kind === 'banner') { step.text = '灵符'; step.sub = '试笔'; step.dur = 80; }
    if (kind === 'float') { step.text = '试笔'; step.color = '#c8a060'; step.size = 16; step.where = 'caster'; }
    if (kind === 'damageRadius') { step.rx = 120; step.ry = 80; step.damage = 14; }
    if (kind === 'damageCone') { step.reach = 160; step.halfH = 50; step.damage = 18; }
    if (kind === 'spawnVolley') { step.style = 'skySword'; step.count = 5; step.interval = 8; step.damage = 10; }
    if (kind === 'knockback') { step.r = 140; step.kbX = 6; step.kbY = -2; }
    if (kind === 'status') { step.poshi = true; }
    if (kind === 'fx' && section === 'talismanScripts') {
      step.preset = step.preset || 'flare';
      step.at = step.at || 'caster';
      step.size = step.size || 60;
      step.color = step.color || '#e8d0a0';
    }
    def[cfg.listKey].push(step);
    renderRecipeEditor(section);
    toast(`已加入「${meta.label || kind}」`);
  }

  /* ── Recipe editor ─────────────────────────────────────── */

  function renderSelect(section) {
    const sel = $(`#sel-${section}`);
    if (!sel) return;
    const list = state.content[section];
    sel.innerHTML = '';
    if (!list.length) {
      const o = document.createElement('option');
      o.value = '-1';
      o.textContent = '（尚无配方）';
      sel.append(o);
      return;
    }
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `${d.id || '未编号'}${d.label ? ' · ' + d.label : ''}`;
      if (i === state.sel[section]) o.selected = true;
      sel.append(o);
    });
  }

  function renderDefFields(section, def, container) {
    const bag = SCHEMA[section];
    if (!bag || !Array.isArray(bag.defFields) || !bag.defFields.length) return;
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    for (const f of bag.defFields) {
      const copy = { ...f };
      if (copy.key === 'anim' && (section === 'talismanScripts' || section === 'animRecipes')) {
        copy.datalist = copy.datalist || 'talismanAnimRecipeIds';
      }
      const node = renderFieldInput(copy, def, () => {
        renderSelect(section);
        updatePreview(section);
        refreshExportPreview();
      });
      grid.append(node);
    }
    container.append(grid);
  }

  function combatStyleIdOptions() {
    const core = (SCHEMA && SCHEMA.coreCombatStyleIds) || ['blade', 'bare'];
    const fromPack = (state.content.combatStyles || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...fromPack])];
  }

  function animRecipeIdOptions() {
    const core = (SCHEMA && SCHEMA.coreAnimRecipeIds) || [
      'slashInk', 'thrustInk', 'sealBurst', 'hopSlash', 'dashThrust',
      'crescentInk', 'groundBreak', 'mistRise', 'sealStampFull', 'sealRainCast',
      'baguaBind', 'paperBurnBurst', 'exorcismPulse',
    ];
    const fromPack = (state.content.animRecipes || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...fromPack])];
  }

  function talismanAnimRecipeIdOptions() {
    const core = (SCHEMA && SCHEMA.coreTalismanAnimRecipeIds) || [
      'sealBurst', 'sealStampFull', 'sealRainCast', 'baguaBind', 'paperBurnBurst', 'exorcismPulse',
    ];
    // 全核心 + 本卷：便于点选，符向子集优先列前
    const allCore = (SCHEMA && SCHEMA.coreAnimRecipeIds) || [];
    const fromPack = (state.content.animRecipes || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...allCore, ...fromPack])];
  }

  function talismanScriptIdOptions() {
    const core = (SCHEMA && SCHEMA.coreScriptIds) || [];
    const fromPack = (state.content.talismanScripts || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...fromPack])];
  }

  function behaviorIdOptions() {
    const core = (SCHEMA && SCHEMA.coreBehaviorIds) || ['axe', 'shield', 'archer', 'spear', 'gargoyle'];
    const fromPack = (state.content.behaviors || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...fromPack])];
  }

  function silhouetteIdOptions() {
    const core = (SCHEMA && SCHEMA.coreSilhouetteIds) || ['axe', 'shield', 'archer', 'spear', 'gargoyle'];
    const fromPack = (state.content.silhouettes || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...fromPack])];
  }

  function colliderIdOptions() {
    const core = (SCHEMA && SCHEMA.coreColliderIds) || ['axe', 'shield', 'archer', 'spear', 'gargoyle'];
    const fromPack = (state.content.colliders || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...core, ...fromPack])];
  }

  /** attackKey / attackKeys：本卷 attacks + 长夜 CORE_ATTACK_BOXES（schema.coreAttackKeys，含 charge/arrow） */
  function attackKeyOptions() {
    const core = (SCHEMA && SCHEMA.coreAttackKeys) || [];
    const fromPack = (state.content.attacks || []).map((x) => x.id || x.name).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** playPose.poseId 等：本卷 poses + 长夜 CORE_POSES（schema.corePoseIds） */
  function poseIdOptions() {
    const core = (SCHEMA && SCHEMA.corePoseIds) || [];
    const fromPack = (state.content.poses || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** inkBurst/fx.recipeId：本卷 fxRecipes + 长夜 CORE_FX_RECIPES（schema.coreFxRecipeIds） */
  function fxRecipeIdOptions() {
    const core = (SCHEMA && SCHEMA.coreFxRecipeIds) || ['flare', 'ring', 'spark', 'qi', 'fire', 'dust', 'swordQi'];
    const fromPack = (state.content.fxRecipes || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** rangedAttack.projectileId：本卷 projectiles + 长夜 CORE_PROJECTILES */
  function projectileIdOptions() {
    const core = (SCHEMA && SCHEMA.coreProjectileIds) || ['arrow', 'fireball'];
    const fromPack = (state.content.projectiles || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** spawnVolley.volleyId：本卷 volleys + 长夜 CORE_VOLLEYS */
  function volleyIdOptions() {
    const core = (SCHEMA && SCHEMA.coreVolleyIds) || ['skySword', 'thunder', 'waterPulse'];
    const fromPack = (state.content.volleys || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** sprite.sheetId / spriteOverlay：本卷 sheets + 长夜 CORE_SHEETS */
  function sheetIdOptions() {
    const core = (SCHEMA && SCHEMA.coreSheetIds) || [
      'blade_ink', 'dagger_ink', 'spear_ink', 'axe_ink', 'twin_ink', 'greatsword_ink',
    ];
    const fromPack = (state.content.sheets || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** ScriptStep.sfx id：本卷 sfx + 长夜 CORE_SFX synth ids */
  function sfxIdOptions() {
    const core = (SCHEMA && SCHEMA.coreSynthIds) || ['slash', 'hit', 'fire', 'boom'];
    const fromPack = (state.content.sfx || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** Stage.backdropTheme：本卷 backdrops + 长夜 CORE_BACKDROPS */
  function backdropIdOptions() {
    const core = (SCHEMA && SCHEMA.coreBackdropIds) || ['night', 'dock', 'ash', 'eclipse'];
    const fromPack = (state.content.backdrops || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** kit 权重 move：本卷 bossMoves + 长夜 CORE_BOSS_MOVES（运行期缺失 warn+跳过） */
  function bossMoveIdOptions() {
    const core = (SCHEMA && SCHEMA.coreBossMoveIds) || ['claw','charge','fireball','dive','roar','walk','slam','sweep','summonAdds','inkNova'];
    const fromPack = (state.content.bossMoves || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** EnemyDef.kitId / Stage.boss.kit：本卷 bossKits + 长夜 CORE kits */
  function bossKitIdOptions() {
    const core = (SCHEMA && SCHEMA.coreBossKitIds) || ['stone','rain','tomb','night'];
    const fromPack = (state.content.bossKits || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** Arena.eliteWeight 键：本卷 eliteMods + 长夜 CORE_ELITE_MODS */
  function eliteModIdOptions() {
    const core = (SCHEMA && SCHEMA.coreEliteModIds) || ['tongpi','shixue','shanbu','fanshang','zhongji','xiehuo'];
    const fromPack = (state.content.eliteMods || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** EliteModDef.summonEnemyId：本卷 enemies + 长夜机体 */
  function enemyIdOptions() {
    return enemyTypeOptions();
  }

  /** craft.materials / cost 键：本卷 materials + 长夜 CORE_MATERIALS */
  function materialIdOptions() {
    const core = (SCHEMA && SCHEMA.coreMaterialIds) || ['iron','bone','hide','herb','silk','cinnabar','coal','xuaniron','spiritjade','yaohe'];
    const fromPack = (state.content.materials || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** ArmorSetDef.slots / ArmorDef.slot 闭集七 */
  function armorSlotIdOptions() {
    return ((SCHEMA && SCHEMA.armorSlots) || ['head','body','arms','legs','neck','ring','waist']).slice();
  }

  /** loot setId 软引用：本卷 armorSets + 长夜核心 */
  function armorSetIdOptions() {
    const core = (SCHEMA && SCHEMA.coreArmorSetIds) || ['yexing','tiegu','yinixue','pojunrui','qingxinding','anhunling','yingzhi'];
    const fromPack = (state.content.armorSets || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** ActPool.blueprintLean：本卷 weapons + 长夜核心兵器 id */
  function weaponIdOptions() {
    const core = (SCHEMA && SCHEMA.coreWeaponIds) || ['silver','thorn','spear','axe','twin','ironfist','clawglove','dao','softsword','halberd','pike','hammer','guandao','bell'];
    const fromPack = (state.content.weapons || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  /** Arena.affixBias / AffixDef.evolveTo：本卷 affixes + 长夜 CORE_AFFIXES */
  function affixIdOptions() {
    const core = (SCHEMA && SCHEMA.coreAffixIds) || ['duwu','nifeng','huashi','yinhuo','canyue','anhuenzhong','zhanghai'];
    const fromPack = (state.content.affixes || []).map((x) => x.id).filter(Boolean);
    return [...new Set([...fromPack, ...core])];
  }

  function attachDatalist(input, field) {
    if (!field || !field.datalist || !SCHEMA) return;
    let values = [];
    let listId = '';
    if (field.datalist === 'coreAttackKeys') {
      listId = 'dl-core-attacks';
      values = attackKeyOptions();
    } else if (field.datalist === 'combatStyleIds') {
      listId = 'dl-combat-styles';
      values = combatStyleIdOptions();
    } else if (field.datalist === 'animRecipeIds') {
      listId = 'dl-anim-recipes';
      values = animRecipeIdOptions();
    } else if (field.datalist === 'talismanAnimRecipeIds') {
      listId = 'dl-talisman-anim-recipes';
      values = talismanAnimRecipeIdOptions();
    } else if (field.datalist === 'talismanScriptIds') {
      listId = 'dl-talisman-scripts';
      values = talismanScriptIdOptions();
    } else if (field.datalist === 'behaviorIds') {
      listId = 'dl-behavior-ids';
      values = behaviorIdOptions();
    } else if (field.datalist === 'silhouetteIds') {
      listId = 'dl-silhouette-ids';
      values = silhouetteIdOptions();
    } else if (field.datalist === 'colliderIds') {
      listId = 'dl-collider-ids';
      values = colliderIdOptions();
    } else if (field.datalist === 'poseIds') {
      listId = 'dl-pose-ids';
      values = poseIdOptions();
    } else if (field.datalist === 'fxRecipeIds') {
      listId = 'dl-fx-recipe-ids';
      values = fxRecipeIdOptions();
    } else if (field.datalist === 'projectileIds') {
      listId = 'dl-projectile-ids';
      values = projectileIdOptions();
    } else if (field.datalist === 'volleyIds') {
      listId = 'dl-volley-ids';
      values = volleyIdOptions();
    } else if (field.datalist === 'sheetIds') {
      listId = 'dl-sheet-ids';
      values = sheetIdOptions();
    } else if (field.datalist === 'sfxIds') {
      listId = 'dl-sfx-ids';
      values = sfxIdOptions();
    } else if (field.datalist === 'backdropIds') {
      listId = 'dl-backdrop-ids';
      values = backdropIdOptions();
    } else if (field.datalist === 'bossMoveIds') {
      listId = 'dl-boss-move-ids';
      values = bossMoveIdOptions();
    } else if (field.datalist === 'bossKitIds') {
      listId = 'dl-boss-kit-ids';
      values = bossKitIdOptions();
    } else if (field.datalist === 'eliteModIds') {
      listId = 'dl-elite-mod-ids';
      values = eliteModIdOptions();
    } else if (field.datalist === 'enemyIds') {
      listId = 'dl-enemy-ids';
      values = enemyIdOptions();
    } else if (field.datalist === 'materialIds') {
      listId = 'dl-material-ids';
      values = materialIdOptions();
    } else if (field.datalist === 'armorSlotIds') {
      listId = 'dl-armor-slot-ids';
      values = armorSlotIdOptions();
    } else if (field.datalist === 'armorSetIds') {
      listId = 'dl-armor-set-ids';
      values = armorSetIdOptions();
    } else if (field.datalist === 'affixIds') {
      listId = 'dl-affix-ids';
      values = affixIdOptions();
    } else if (field.datalist === 'weaponIds') {
      listId = 'dl-weapon-ids';
      values = weaponIdOptions();
    } else if (field.datalist === 'locoPoseIds') {
      // Loco3: closed-set locomotion pose ids (hp.*/sp.*) for poses.id datalist
      listId = 'dl-loco-pose-ids';
      values = (SCHEMA && SCHEMA.locoPoseIds) || [
        'hp.idle', 'hp.idle2', 'hp.run1', 'hp.run2', 'hp.hurt',
        'sp.idle', 'sp.walk1', 'sp.walk2', 'sp.hurt',
      ];
    } else {
      return;
    }
    let dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      document.body.append(dl);
    }
    // refresh options each bind (pack styles may change)
    dl.innerHTML = '';
    for (const k of values) {
      const o = document.createElement('option');
      o.value = k;
      dl.append(o);
    }
    input.setAttribute('list', listId);
  }

  /** sheet/sfx src：禁外链；须 ./art/（对齐 T3 icon / SheetService ART_SRC_RE） */
  function isForbiddenArtSrc(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s) || s.includes('://')) return '禁止外链 URL（须 ./art/ 相对路径）';
    if (!/^\.\/art\//.test(s)) return '须为 ./art/ 下相对路径';
    return null;
  }

  function renderFieldInput(field, obj, onChange) {
    const lab = document.createElement('label');
    lab.className = 'field';
    const span = document.createElement('span');
    span.textContent = (field.label || field.key) + (field.required ? ' *' : '');
    if (field.key && field.label && field.label !== field.key) {
      span.title = field.key;
    }
    if (field.hint) span.title = (span.title ? span.title + ' · ' : '') + field.hint;
    lab.append(span);

    let input;
    const path = field.key;
    const cur = getAt(obj, path);

    const commit = (v) => {
      if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) setAt(obj, path, undefined);
      else setAt(obj, path, v);
      // prune empty feel/unlock/craft shells
      if (obj.feel && obj.feel.boxTune && !Object.keys(obj.feel.boxTune).length) {
        delete obj.feel.boxTune;
      }
      if (obj.feel && !Object.keys(obj.feel).length) delete obj.feel;
      onChange();
    };

    if (field.type === 'boolean') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(cur);
      input.addEventListener('change', () => {
        setAt(obj, path, input.checked);
        onChange();
      });
    } else if (field.type === 'enum') {
      input = document.createElement('select');
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '—';
      input.append(empty);
      // dynamic lookId / combatStyleId options
      let opts = field.enum || [];
      if (path === 'lookId') {
        const core = (SCHEMA && SCHEMA.coreWeaponLookIds) || [];
        const fromPack = (state.content.weaponLooks || []).map((x) => x.id).filter(Boolean);
        opts = [...new Set([...(opts || []), ...core, ...fromPack])];
      }
      if (path === 'combatStyleId') {
        const core = (SCHEMA && SCHEMA.coreCombatStyleIds) || ['blade', 'bare'];
        const fromPack = (state.content.combatStyles || []).map((x) => x.id).filter(Boolean);
        opts = [...new Set([...(opts || []), ...core, ...fromPack])];
      }
      for (const opt of opts) {
        const o = document.createElement('option');
        o.value = String(opt);
        // Pose2: playPose.timeline 人话选项
        if (path === 'timeline' && opt === 'strike') o.textContent = 'strike · 击发定格（默认）';
        else if (path === 'timeline' && opt === 'full') o.textContent = 'full · 全时间轴 wind→strike→rec';
        else o.textContent = String(opt);
        if (String(cur ?? '') === String(opt)) o.selected = true;
        input.append(o);
      }
      input.addEventListener('change', () => {
        const v = coerceValue('enum', input.value, field);
        if (v === undefined || input.value === '') commit(undefined);
        else commit(v);
      });
    } else if (field.type === 'color') {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.gap = '0.35rem';
      const color = document.createElement('input');
      color.type = 'color';
      const text = document.createElement('input');
      text.type = 'text';
      text.placeholder = '#rrggbb';
      const hex = typeof cur === 'string' && /^#[0-9a-fA-F]{6}$/.test(cur) ? cur : '#c8b090';
      color.value = hex;
      text.value = cur ?? '';
      const sync = () => {
        const v = text.value.trim();
        if (!v) commit(undefined);
        else {
          setAt(obj, path, v);
          if (/^#[0-9a-fA-F]{6}$/.test(v)) color.value = v;
          onChange();
        }
      };
      color.addEventListener('input', () => { text.value = color.value; sync(); });
      text.addEventListener('change', sync);
      wrap.append(color, text);
      lab.append(wrap);
      return lab;
    } else if (field.type === 'number') {
      input = document.createElement('input');
      input.type = 'number';
      if (field.min != null) input.min = field.min;
      if (field.max != null) input.max = field.max;
      input.step = 'any';
      input.value = cur != null ? cur : '';
      input.addEventListener('change', () => {
        commit(coerceValue('number', input.value, field));
      });
    } else if (field.type === 'stringList') {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.hint || '逗号分隔';
      input.value = Array.isArray(cur) ? cur.join(', ') : (cur ?? '');
      attachDatalist(input, field);
      input.addEventListener('change', () => {
        commit(coerceValue('stringList', input.value, field));
      });
    } else if (field.type === 'numberList') {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.hint || '逗号分隔数字（五阶）';
      input.value = Array.isArray(cur) ? cur.join(', ') : (cur ?? '');
      input.addEventListener('change', () => {
        commit(coerceValue('numberList', input.value, field));
      });
    } else if (field.type === 'materialMap' || field.type === 'object') {
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.hint || 'iron:2, silk:1';
      input.value = formatMaterialMap(cur);
      attachDatalist(input, field);
      input.addEventListener('change', () => {
        commit(coerceValue('materialMap', input.value, field));
      });
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = cur ?? '';
      input.placeholder = field.hint || '';
      attachDatalist(input, field);
      input.addEventListener('change', () => {
        const raw = input.value;
        if (field.artSrc && String(raw || '').trim()) {
          const err = isForbiddenArtSrc(raw);
          if (err) {
            toast(err);
            input.value = cur ?? '';
            return;
          }
        }
        commit(coerceValue('string', raw, field));
      });
    }
    lab.append(input);
    if (field.presets && field.presets.length) {
      const row = document.createElement('div');
      row.className = 'preset-row';
      for (const pr of field.presets) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'preset-chip';
        b.textContent = pr.label;
        b.addEventListener('click', () => {
          setAt(obj, path, pr.value);
          onChange();
          // re-render so input shows new value
          if (typeof window.__designerRerenderGameplay === 'function') {
            window.__designerRerenderGameplay();
          }
        });
        row.append(b);
      }
      lab.append(row);
    }
    return lab;
  }

  function renderRecipeEditor(section) {
    renderSelect(section);
    const root = $(`#editor-${section}`);
    root.innerHTML = '';
    const list = state.content[section];
    if (!list.length) {
      root.innerHTML = '<div class="empty-recipe">尚无配方 · 点「新…」开卷，再自左侧点积木</div>';
      updatePreview(section);
      return;
    }
    const idx = Math.min(Math.max(0, state.sel[section]), list.length - 1);
    state.sel[section] = idx;
    const def = list[idx];
    const cfg = LIST_KEYS[section];

    renderDefFields(section, def, root);

    const listTitle = document.createElement('h3');
    listTitle.style.cssText = 'margin:1rem 0 0.5rem;font-size:0.85rem;letter-spacing:0.18em;color:var(--moon-soft)';
    listTitle.textContent = `${cfg.itemLabel}列表（点左侧积木追加）`;
    root.append(listTitle);

    const steps = def[cfg.listKey] || [];
    const stepList = document.createElement('div');
    stepList.className = 'step-list';

    if (!steps.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-recipe';
      empty.textContent = `尚无${cfg.itemLabel} · 自左侧白名单点入`;
      stepList.append(empty);
    }

    steps.forEach((step, si) => {
      const meta = kindMeta(section, step.kind);
      const card = document.createElement('div');
      card.className = 'step-card';
      const head = document.createElement('div');
      head.className = 'step-head';
      head.innerHTML = `<span class="step-kind">${step.kind}</span><span class="step-label">${meta?.label || ''}</span>`;
      const actions = document.createElement('div');
      actions.className = 'step-actions';
      const mkBtn = (label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', fn);
        return b;
      };
      actions.append(
        mkBtn('↑', () => {
          if (si === 0) return;
          [steps[si - 1], steps[si]] = [steps[si], steps[si - 1]];
          renderRecipeEditor(section);
        }),
        mkBtn('↓', () => {
          if (si >= steps.length - 1) return;
          [steps[si + 1], steps[si]] = [steps[si], steps[si + 1]];
          renderRecipeEditor(section);
        }),
        mkBtn('删', () => {
          steps.splice(si, 1);
          renderRecipeEditor(section);
          toast('已删积木');
        }),
      );
      head.append(actions);
      card.append(head);

      if (meta && meta.fields && meta.fields.length) {
        const fields = document.createElement('div');
        fields.className = 'step-fields';
        for (const f of meta.fields) {
          fields.append(renderFieldInput(f, step, () => {
            updatePreview(section);
            refreshExportPreview();
          }));
        }
        card.append(fields);
      }
      stepList.append(card);
    });

    root.append(stepList);
    updatePreview(section);
    refreshExportPreview();
  }

  function kindLabel(section, kind) {
    const m = kindMeta(section, kind);
    return (m && m.label) || kind;
  }

  function humanPreview(section, def) {
    if (!def) return '（还没有东西）';
    if (section === 'behaviors') {
      const steps = def.steps || [];
      const bits = steps.map((s) => {
        const lab = kindLabel('behaviors', s.kind);
        if (s.kind === 'keepDistance') return `保持约 ${s.idealMin ?? '?'}–${s.idealMax ?? '?'} 步距`;
        if (s.kind === 'meleeAttack') return `近处用「${s.attackKey || '默认'}」砍`;
        if (s.kind === 'rangedAttack') return `远处放「${s.projectileId || '箭'}」`;
        if (s.kind === 'dodge') return `贴身时${s.direction === 'side' ? '横跳' : '后撤'}闪身`;
        if (s.kind === 'circleStrafe') return `绕圈（半径约 ${s.radius ?? 130}）`;
        if (s.kind === 'flank') return s.preferBehind ? '抄到你身后' : '侧翼包抄';
        if (s.kind === 'callAlly') return `呼叫「${s.enemyId || '？'}」上场`;
        if (s.kind === 'phaseAtHp') return `气血低于 ${Math.round((s.below ?? 0) * 100)}% 进入「${s.setPhase || '?'}」`;
        if (s.kind === 'phaseGate') return `仅在「${s.phase}」阶段启用内招`;
        if (s.kind === 'comboChain') return `连斩：${(s.attackKeys || []).join(' → ') || '（空）'}`;
        if (s.kind === 'retreatBurst') return `急退约 ${s.dist ?? 90} 步`;
        if (s.kind === 'taunt') return `喝道「${s.text || '挑衅'}」`;
        if (s.kind === 'idleEmote') return `闲态「${s.text || '……'}」`;
        if (s.kind === 'useLoadout') return '使用随身外功/符/丹';
        if (s.kind === 'charge') return '直线冲锋';
        if (s.kind === 'block') return '举盾格挡';
        if (s.kind === 'facePlayer') return '始终盯着你';
        if (s.kind === 'idlePace') return '来回踱步';
        return lab;
      });
      const name = def.label || def.id || '这只敌人';
      return `<h3>这只敌人会…</h3><p class="hp-name">${name}</p><ul>${bits.map((b) => `<li>${b}</li>`).join('') || '<li>（尚未加招）</li>'}</ul>`;
    }
    if (section === 'silhouettes') {
      const parts = def.parts || [];
      const bits = parts.map((p) => {
        const lab = kindLabel('silhouettes', p.kind);
        if (p.kind === 'cloak') return `披风：${p.style || '长'}`;
        if (p.kind === 'armorLayer') return `甲片：${p.slot || '胸'}·${p.style || '轻'}`;
        if (p.kind === 'ornament') return `饰物：${p.slot || '腰'}·${p.style || ''}`;
        if (p.kind === 'faceMark') return `面记：${p.style || '无'}`;
        if (p.kind === 'stanceBias') return `站姿偏倾 ${p.lean ?? 0} / 蹲 ${p.crouch ?? 0}`;
        if (p.kind === 'headgear') return `头面：${p.style || '默认'}`;
        if (p.kind === 'mainhand') return p.fromWeapon ? '兵器跟装备走' : `兵器形：${p.shape || '自定义'}`;
        if (p.kind === 'palette') return '换了一身配色';
        if (p.kind === 'scale') return `体型 ×${p.value ?? 1}`;
        return lab;
      });
      return `<h3>长相一览</h3><p class="hp-name">${def.label || def.id}</p><ul>${bits.map((b) => `<li>${b}</li>`).join('') || '<li>（素颜骨架）</li>'}</ul>`;
    }
    if (section === 'weaponLooks') {
      const parts = def.parts || [];
      const bits = parts.map((p) => kindLabel('weaponLooks', p.kind) + (p.style ? `·${p.style}` : '') + (p.profile ? `·${p.profile}` : ''));
      return `<h3>这柄兵器</h3><p class="hp-name">${def.label || def.id}</p><p>基形 ${def.baseShape || '—'}</p><ul>${bits.map((b) => `<li>${b}</li>`).join('') || '<li>（空）</li>'}</ul>`;
    }
    if (section === 'animRecipes') {
      const steps = def.steps || [];
      return `<h3>招式样子</h3><p class="hp-name">${def.label || def.id}</p><ul>${steps.map((s) => {
        let bit = s.kind;
        if (s.poseId) bit += ' · ' + s.poseId;
        if (s.kind === 'playPose' && s.timeline === 'full') bit += ' · 全时间轴';
        else if (s.kind === 'playPose' && s.timeline === 'strike') bit += ' · 击发定格';
        return `<li>${bit}</li>`;
      }).join('') || '<li>（空）</li>'}</ul>`;
    }
    if (section === 'talismanScripts') {
      const steps = def.steps || [];
      const kinds = steps.map((s) => s && s.kind).filter(Boolean);
      const anim = def.anim
        ? `anim <code>${escapeHtml(String(def.anim))}</code>`
        : 'anim（未挂）';
      return `<h3>符效时间轴</h3><p class="hp-name">${escapeHtml(def.label || def.id || '?')}</p><ul>
        <li>${anim}</li>
        <li>步骤 ${steps.length}：${kinds.length ? kinds.map((k) => escapeHtml(k)).join(' · ') : '（空）'}</li>
      </ul>`;
    }
    if (section === 'stages') {
      const arenas = def.arenas || [];
      const waves = arenas.map((a, i) => {
        const wcount = (a.waves || []).length;
        const types = (a.waves || []).flat().map((s) => s.type).filter(Boolean);
        const uniq = [...new Set(types)];
        return `第 ${i + 1} 场「${a.name || '?'}」：${wcount} 浪，来客 ${uniq.join('、') || '无'}${a.eliteWeight ? '（自带精英偏重）' : ''}${a.affixBias && a.affixBias.length ? '（偏味 ' + a.affixBias.join('/') + '）' : ''}`;
      });
      const boss = def.boss
        ? `Boss「${def.boss.bossName || def.boss.bossId}」· 气血×${def.boss.hpScale ?? 1}${def.boss.kit ? ` · 怎么凶 ${def.boss.kit}` : ''}`
        : '尚无 Boss';
      return `<h3>这一浪会出…</h3><p class="hp-name">${def.title || def.id}</p><ul>${waves.map((w) => `<li>${w}</li>`).join('')}<li>${boss}</li></ul>`;
    }
    if (section === 'acts') {
      if (!def) {
        return `<h3>幕池</h3><p class="hint">尚未选幕池 / 幕间。整幕默认与关卡浪次分栏。</p>`;
      }
      if (def.__kind === 'beat') {
        return `<h3>幕间字幕</h3><p class="hp-name">${escapeHtml(def.title || def.id || '?')}</p><ul>
          <li>离开第 ${def.fromAct ?? '—'} 幕 → when <code>betweenActs</code></li>
          <li>${escapeHtml(def.subtitle || '（无副题）')}</li>
          <li>停留 ${def.holdFrames ?? '—'} 帧 · 慢镜 ${def.slowmo ?? '—'}</li>
          <li>场内 enter/beforeBoss 请走关卡 beats</li>
        </ul>`;
      }
      const ew = def.eliteWeights || {};
      const ewKeys = Object.keys(ew);
      return `<h3>整幕默认</h3><p class="hp-name">第 ${(def.actIndex ?? 0) + 1} 幕 · ${escapeHtml(def.loreLine || '（无 Lore）')}</p><ul>
        <li>怎么凶 <code>${escapeHtml(String(def.kit || '—'))}</code> · 染色 ${escapeHtml(String(def.tint || '—'))}</li>
        <li>精英偏重 ${ewKeys.length ? ewKeys.map((k) => escapeHtml(k) + ':' + ew[k]).join(' · ') : '（空）'}</li>
        <li>材料 ${(def.dropLean || []).join('、') || '—'} · 图纸 ${(def.blueprintLean || []).join('、') || '—'} · 套装 ${(def.setLean || []).join('、') || '—'}</li>
        <li>单场 eliteWeight / 场内 beat 仍在「关卡浪次」</li>
      </ul>`;
    }
    if (section === 'gameplay') {
      const kind = state.gpKind;
      if (kind === 'attacks') {
        const box = def.box || {};
        return `<h3>这只攻击盒</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code>（目录 id · 只认 ctx.attacks）</li>
          <li>帧：前摇 ${def.startup ?? '—'} · 判定 ${def.active ?? '—'} · 后摇 ${def.recovery ?? '—'}</li>
          <li>盒：${box.x ?? '—'},${box.y ?? '—'} · ${box.w ?? '—'}×${box.h ?? '—'}</li>
          <li>伤 ${def.damage ?? '—'} · 击退 ${def.kbX ?? '—'}/${def.kbY ?? '—'} · 挥砍 ${def.swing || '—'}</li>
          <li>Behavior / 外功 <code>attackKey</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'fxRecipes') {
        const em = def.emitter || '—';
        return `<h3>这条特效配方</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>发射器 <code>${escapeHtml(String(em))}</code>（闭集七选一 · FxPreset）</li>
          <li>色 ${def.color ? escapeHtml(String(def.color)) : '（默认）'} · 大小 ${def.size ?? '（默认）'} · 寿命 ${def.life ?? '（默认）'}</li>
          <li>粒子数 ${def.n ?? '（默认）'} · 重效 ${def.heavy ? '是' : '否'}</li>
          <li>anim <code>inkBurst.recipeId</code> / 符 <code>fx.recipeId</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'poses') {
        const w = def.wind || {};
        const s = def.strike || {};
        const r = def.rec || {};
        const pid = String(def.id || '');
        const isLoco = /^(hp|sp)\./.test(pid);
        if (isLoco) {
          return `<h3>这条 locomotion 姿态</h3><p class="hp-name">${escapeHtml(pid || '?')}</p><ul>
          <li>前缀约定：玩家 <code>hp.*</code> · 杂兵 <code>sp.*</code>（与攻击姿 slash/skel/garg 区分）</li>
          <li>三帧 PoseNums；运行时 <code>locoPose</code> <b>只读 strike</b> · 建议三帧同填</li>
          <li>击发 lean ${s.lean ?? '—'} · fa ${s.fa ?? '—'} · w ${s.w ?? '—'}</li>
          <li>蓄势 lean ${w.lean ?? '—'} · 收势 lean ${r.lean ?? '—'}${ (w.lean === s.lean && s.lean === r.lean) ? ' · <em>已同填</em>' : '' }</li>
          <li>闭集：hp.idle|idle2|run1|run2|hurt · sp.idle|walk1|walk2|hurt</li>
        </ul>`;
        }
        return `<h3>这条攻击姿态</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>三帧 PoseNums：蓄势 / 击发 / 收势（各 y·lean·头·肢·兵刃角）</li>
          <li>击发 lean ${s.lean ?? '—'} · fa ${s.fa ?? '—'} · w ${s.w ?? '—'}</li>
          <li>蓄势 lean ${w.lean ?? '—'} · 收势 lean ${r.lean ?? '—'}</li>
          <li>anim <code>playPose.poseId</code> 挂此 id（默认 strike 定格；<code>timeline:full</code> 播三帧）</li>
          <li>locomotion 请用 <code>hp.*</code>/<code>sp.*</code> 前缀（见 poses 页 note）</li>
        </ul>`;
      }
      if (kind === 'projectiles') {
        return `<h3>这只投射物</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>绘制种 <code>${escapeHtml(String(def.drawKind || '—'))}</code>（闭集 arrow|fireball）</li>
          <li>碰撞 ${def.hitW ?? '—'}×${def.hitH ?? '—'} · 寿命 ${def.life ?? '（默认）'}</li>
          <li>伤害盒 <code>${escapeHtml(String(def.attackKey || 'arrow'))}</code>${def.attackKey ? '' : '（缺省）'} · <em>改伤害请挂攻击盒</em></li>
          <li>落地爆炸 ${def.explodeOnGround ? '是' : '否'} · 拖尾 ${def.trailEvery ?? '（无）'}</li>
          <li>命中音 ${def.hitSfx ? escapeHtml(String(def.hitSfx)) : '—'} · 爆炸音 ${def.explodeSfx ? escapeHtml(String(def.explodeSfx)) : '—'}</li>
          <li>Behavior <code>rangedAttack.projectileId</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'volleys') {
        return `<h3>这条弹幕模板</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>样式 <code>${escapeHtml(String(def.style || '—'))}</code>（闭集 skySword|thunder|waterPulse）</li>
          <li>默认：次数 ${def.defaultCount ?? '—'} · 间隔 ${def.defaultInterval ?? '—'} · 散布 ${def.defaultSpread ?? '—'} · 半径 ${def.defaultRadius ?? '—'}</li>
          <li>色 ${def.color ? escapeHtml(String(def.color)) : '（默认）'}</li>
          <li>符 <code>spawnVolley.volleyId</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'sheets') {
        return `<h3>这张图集</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>路径 <code>${escapeHtml(String(def.src || '—'))}</code>（须 ./art/ · 禁外链）</li>
          <li>帧 ${def.frameW ?? '—'}×${def.frameH ?? '—'} · 帧数 ${def.frames ?? '—'} · 限额 ${def.maxBytes ?? '（默认）'}</li>
          <li>兵器 <code>sprite.sheetId</code> / 零件 <code>spriteOverlay.sheetId</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'sfx') {
        return `<h3>这条音效</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>合成器 <code>${escapeHtml(String(def.synth || '—'))}</code>（可与文件并存 · 无 buffer 时回退）</li>
          <li>包内文件 ${def.src ? escapeHtml(String(def.src)) + (def.format ? ' · ' + escapeHtml(String(def.format)) : '') : '（无 · synth-only）'} · 须预先放 <code>public/art/audio/</code>（馆包不送达二进制）</li>
          <li>符 <code>sfx.id</code> / 投射物 <code>hitSfx</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'backdrops') {
        return `<h3>这幕氛围</h3><p class="hp-name">${escapeHtml(def.label || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · theme <code>${escapeHtml(String(def.theme || '—'))}</code>（闭集四）</li>
          <li>天空 ${def.skyTint ? escapeHtml(String(def.skyTint)) : '—'} · 雾 ${def.fogTint ? escapeHtml(String(def.fogTint)) : '—'} · 地 ${def.groundTint ? escapeHtml(String(def.groundTint)) : '—'}</li>
          <li>关卡 <code>backdropTheme</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'colliders') {
        return `<h3>这只碰撞盒</h3><p class="hp-name">${def.label || def.id}</p><ul>
          <li>编号：${def.id || '—'}</li>
          <li>尺寸：${def.w ?? '—'}×${def.h ?? '—'}</li>
          <li>受击内缩：${def.hurtInset ?? '（默认）'}</li>
          <li>重力倍率：${def.gravityScale ?? '（默认）'}</li>
        </ul>`;
      }
      if (kind === 'bossMoves') {
        return `<h3>这记 Boss 招</h3><p class="hp-name">${escapeHtml(def.label || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code></li>
          <li>原语 kind <code>${escapeHtml(String(def.kind || '—'))}</code>（闭集 10）</li>
          <li>半径 ${def.radius ?? '—'} · 伤 ${def.damage ?? '—'} · 宽 ${def.width ?? '—'} · 顿帧 ${def.hitstop ?? '—'}</li>
          <li>召卫 ${def.enemyId ? escapeHtml(String(def.enemyId)) : '—'} ×${def.count ?? '—'} · 侧 ${def.side || '—'}</li>
          <li>帧 ${def.frames ?? '—'} · 色 ${def.color ? escapeHtml(String(def.color)) : '—'}</li>
          <li>kit 权重表用 move 挂此 id（不扩 kind · 无 perch/takeoff）</li>
        </ul>`;
      }
      if (kind === 'bossKits') {
        const fmt = (arr) => (Array.isArray(arr) ? arr : []).map((w) => `${w && w.move ? w.move : '?'}:${w && w.weight != null ? w.weight : '?'}`).join(' · ') || '（空）';
        return `<h3>这套路怎么凶</h3><p class="hp-name">${escapeHtml(def.id || '?')}</p><ul>
          <li>近距：${escapeHtml(fmt(def.close))}</li>
          <li>远距：${escapeHtml(fmt(def.far))}</li>
          <li>挂关卡 <code>boss.kit</code> 或敌寇 <code>kitId</code>（stage 优先）</li>
        </ul>`;
      }
      if (kind === 'eliteMods') {
        const flags = [
          def.dashAway ? '闪步' : null,
          def.fireOnDeath ? '亡火' : null,
          def.summonMinion ? '召卫' : null,
          def.summonFire ? '火圈' : null,
        ].filter(Boolean);
        return `<h3>这条精英词条</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 短标 ${escapeHtml(String(def.tag || '—'))} · 色 ${def.color ? escapeHtml(String(def.color)) : '—'}</li>
          <li>承伤 ${def.dmgTakenMul ?? '—'} · 反伤 ${def.reflect ?? '—'} · 吸血 ${def.lifesteal ?? '—'} · 输出 ${def.heavyMul ?? '—'}</li>
          <li>旗标：${flags.length ? flags.join(' · ') : '（无）'}${def.summonEnemyId ? ' · 召卫 ' + escapeHtml(String(def.summonEnemyId)) : ''}</li>
          <li>关卡 <code>eliteWeight</code> 挂此 id（兵器克制可于导出 JSON 补 weaponCounters）</li>
        </ul>`;
      }
      if (kind === 'fragments') {
        return `<h3>这张残页</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · tag <code>${escapeHtml(String(def.tag || '—'))}</code>（闭集五）</li>
          <li>雾名 ${escapeHtml(String(def.fogName || '—'))} · ${escapeHtml(String(def.desc || ''))}</li>
          <li>效果：外功×${def.skillDmgMul ?? '—'} · 内力×${def.neiliRegenMul ?? '—'} · 破甲+${def.armorPierceBonus ?? '—'} · 闪身×${def.dashCdMul ?? '—'}</li>
          <li>丹药×${def.pillHealMul ?? '—'} · 怒+${def.pillRageBonus ?? '—'} · 承伤×${def.dmgTakenMul ?? '—'} · 全伤×${def.atkMul ?? '—'}</li>
          <li>${def.eventOnly ? '仅事件掉落' : '可进普通掉落'}${def.curse ? ' · 诅咒：' + escapeHtml(String(def.curse)) : ''}</li>
        </ul>`;
      }
      if (kind === 'titles') {
        return `<h3>这枚称号</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code></li>
          <li>达成：${escapeHtml(String(def.desc || '—'))}</li>
          <li>QoL：${escapeHtml(String(def.qol || '—'))}</li>
          <li>开局丹 ${def.startPotions ?? '—'} · 弹反窗+${def.parryWindowBonus ?? '—'} · 店折 ${def.shopDiscount ?? '—'}</li>
        </ul>`;
      }
      if (kind === 'materials') {
        return `<h3>这份材料</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 权重 ${def.weight ?? '—'}${def.rare ? ' · 稀有' : ''}</li>
          <li>${escapeHtml(String(def.lore || ''))}</li>
          <li>供兵器 <code>craft.materials</code> / 符·丹 <code>cost</code> / 内功 <code>meditateCost</code> 挂此 id</li>
        </ul>`;
      }
      if (kind === 'armorSets') {
        const slots = Array.isArray(def.slots) ? def.slots.join(', ') : '—';
        const fmtB = (b) => {
          if (!b || typeof b !== 'object') return '（空）';
          return Object.keys(b).filter((k) => b[k] != null).map((k) => k + '=' + b[k]).join(' · ') || '（空）';
        };
        return `<h3>这套防具</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 雾名 ${escapeHtml(String(def.fogName || '—'))} · 权 ${def.weight ?? '—'}</li>
          <li>槽位（闭集七）：${escapeHtml(slots)}</li>
          <li>两件：${escapeHtml(fmtB(def.two))} · ${escapeHtml(String(def.twoTip || ''))}</li>
          <li>满件：${escapeHtml(fmtB(def.full))} · ${escapeHtml(String(def.fullTip || ''))}</li>
          <li>loot <code>setId</code> 挂此 id（单件目录另编 armorPieces）</li>
        </ul>`;
      }
      if (kind === 'armorPieces') {
        const b = def.base || {};
        return `<h3>这件防具</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 槽 <code>${escapeHtml(String(def.slot || '—'))}</code>（闭集七）</li>
          <li>底：hp ${b.hp ?? '—'} · atk ${b.atk ?? '—'} · def ${b.def ?? '—'} · rage ${b.rage ?? '—'} · 武功% ${b.wugong ?? '—'}</li>
          <li>权重 ${def.weight ?? '—'}${def.common ? ' · 常见' : ''}${def.quality ? ' · ' + escapeHtml(String(def.quality)) : ''}${def.tier != null ? ' · 阶' + def.tier : ''}</li>
          <li>${escapeHtml(String(def.lore || ''))}</li>
        </ul>`;
      }
      if (kind === 'wepAffixes') {
        return `<h3>这条兵器词缀</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 雾名 ${escapeHtml(String(def.fogName || '—'))}</li>
          <li>${escapeHtml(String(def.tip || ''))}</li>
          <li>破韧×${def.poiseMul ?? '—'} · 吸血 ${def.lifesteal ?? '—'} · 回内 ${def.neiliOnHit ?? '—'} · 攻速×${def.speedMul ?? '—'} · 重击×${def.heavyDmgMul ?? '—'} · 体返 ${def.staminaRefund ?? '—'}</li>
        </ul>`;
      }
      if (kind === 'affixes') {
        const bits = [];
        if (def.dotPeriod != null) bits.push('毒雾周期 ' + def.dotPeriod);
        if (def.stillDotPeriod != null) bits.push('阴火立定 ' + def.stillDotPeriod);
        if (def.bellCycle != null) bits.push('钟周期 ' + def.bellCycle);
        if (def.playerWideHitMul != null) bits.push('宽招×' + def.playerWideHitMul);
        if (def.dashCdMul != null) bits.push('闪身冷却×' + def.dashCdMul);
        if (def.dashLenMul != null) bits.push('闪身长×' + def.dashLenMul);
        return `<h3>这条场地词缀</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 雾名 ${escapeHtml(String(def.fogName || '—'))} · 色 ${def.color ? escapeHtml(String(def.color)) : '—'}</li>
          <li>${escapeHtml(String(def.desc || ''))}</li>
          <li>主池权 ${def.primaryWeight ?? '—'} · 副池权 ${def.secondaryWeight ?? '—'}${def.evolveOnly ? ' · 仅演化' : ''}</li>
          <li>效果：${bits.length ? escapeHtml(bits.join(' · ')) : '（未填闭集字段）'}</li>
          <li>演化 ${def.evolveTo ? '<code>' + escapeHtml(String(def.evolveTo)) + '</code>' : '—'} · 帧 ${def.evolveAfter ?? '—'}</li>
          <li>关卡 <code>affixBias</code> 可挂此 id（导演已读 prefer-subset · 债#5）</li>
        </ul>`;
      }
      if (kind === 'pills') {
        const eff = def.effect || {};
        const bits = [];
        if (eff.heal != null) bits.push('回血 ' + eff.heal);
        if (eff.rage != null) bits.push('气势 ' + eff.rage);
        if (eff.neili != null) bits.push('内力 ' + eff.neili);
        if (eff.atkBuffSec != null) bits.push('攻buff ' + eff.atkBuffSec + 's');
        if (eff.defBuffSec != null) bits.push('减伤buff ' + eff.defBuffSec + 's');
        if (eff.invuln != null) bits.push('无敌 ' + eff.invuln + 'f');
        if (eff.clearControl) bits.push('解控');
        if (eff.xuhangTicks != null) bits.push('续航×' + eff.xuhangTicks);
        const cost = formatMaterialMap(def.cost) || '—';
        return `<h3>这枚丹药</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code>${def.sortie ? ' · 可出征' : ''}${def.quality ? ' · ' + escapeHtml(String(def.quality)) : ''}${def.grade ? ' · ' + escapeHtml(String(def.grade)) : ''}</li>
          <li>${escapeHtml(String(def.tip || ''))}</li>
          <li>材料 ${escapeHtml(cost)} · 银 ${def.fee ?? '—'} · 携带 ${def.carryCap ?? '—'}</li>
          <li>效果：${bits.length ? escapeHtml(bits.join(' · ')) : '（未填闭集字段）'}${eff.floatText ? ' · 飘「' + escapeHtml(String(eff.floatText)) + '」' : ''}${eff.sfx ? ' · sfx ' + escapeHtml(String(eff.sfx)) : ''}</li>
          <li>${eff.whileActive && eff.whileActive.auraPreset ? '光环 ' + escapeHtml(String(eff.whileActive.auraPreset)) : '无持续光环'} · cost 挂 materials id</li>
        </ul>`;
      }
      if (kind === 'neigong') {
        const e = def.effects || {};
        const fmtArr = (a) => Array.isArray(a) ? a.join(' / ') : '—';
        const cost = formatMaterialMap(def.meditateCost) || '—';
        return `<h3>这门内功</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>编号 <code>${escapeHtml(String(def.id || '—'))}</code> · 路数 ${escapeHtml(String(def.style || '—'))}${def.quality ? ' · ' + escapeHtml(String(def.quality)) : ''}</li>
          <li>${escapeHtml(String(def.tip || ''))}</li>
          <li>签名：${escapeHtml(String(def.signature || '—'))}</li>
          <li>打坐 ${escapeHtml(cost)} · 银 ${def.fee ?? '—'}</li>
          <li>武功 ${escapeHtml(fmtArr(e.damageBonus))} · 气势 ${escapeHtml(fmtArr(e.rageBonus))}</li>
          <li>减伤 ${escapeHtml(fmtArr(e.defBonus))} · 回内× ${escapeHtml(fmtArr(e.neiliRegenMul))}</li>
          <li>签名上限：处决+${e.executeMulBonus ?? '—'} · 吸血 ${e.lifestealMax ?? '—'} · 弹反窗 ${e.parryWindowBonusMax ?? '—'} · 破韧+${e.poiseMulBonus ?? '—'}</li>
        </ul>`;
      }
      if (kind === 'enemies') {
        const col = def.colliderId
          || (def.collider ? `内联 ${def.collider.w}×${def.collider.h}` : null);
        const colNote = def.colliderId
          && (state.content.colliders || []).some((x) => x.id === def.colliderId)
          ? '（本卷已有）'
          : (def.colliderId ? '（需本卷或长夜登记）' : '');
        const bid = def.behaviorId || '';
        const behs = state.content.behaviors || [];
        const behDef = bid ? behs.find((x) => x.id === bid) : null;
        const hasBeh = !!behDef;
        const behLine = bid
          ? `怎么打 <code>${escapeHtml(String(bid))}</code>${hasBeh ? '（本卷已有）' : '（需本卷或长夜登记）'}`
          : '怎么打（未挂）';
        let stepsLine;
        if (hasBeh) {
          const steps = Array.isArray(behDef.steps) ? behDef.steps : [];
          const kinds = steps.map((s) => s && s.kind).filter(Boolean);
          const uniq = [];
          for (const k of kinds) { if (!uniq.includes(k)) uniq.push(k); }
          const summary = uniq.length ? uniq.join(' · ') : '（无 kind）';
          stepsLine = `打法 ${steps.length} 步：${escapeHtml(summary)}`;
        } else if (bid) {
          stepsLine = '本卷无步骤 / 远程或核心打法';
        } else {
          stepsLine = null; // 无 behaviorId 不写假步数
        }
        const sil = def.silhouetteId
          ? `长相 <code>${escapeHtml(String(def.silhouetteId))}</code>${(state.content.silhouettes || []).some((x) => x.id === def.silhouetteId) ? '（本卷已有）' : '（需本卷或长夜登记）'}`
          : '长相（未挂）';
        const kit = def.kitId
          ? `怎么凶 <code>${escapeHtml(String(def.kitId))}</code>${(state.content.bossKits || []).some((x) => x.id === def.kitId) ? '（本卷已有）' : (((SCHEMA && SCHEMA.coreBossKitIds) || []).includes(def.kitId) ? '（长夜核心）' : '（需本卷或长夜登记）')}`
          : '怎么凶（未挂 kitId）';
        return `<h3>这只敌寇</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>碰撞：${col || '—'}${colNote}</li>
          <li>${sil}</li>
          <li>${behLine}</li>
          ${stepsLine ? `<li>${stepsLine}</li>` : ''}
          <li>${kit}</li>
          <li>气血：${def.hp ?? '—'} · Boss：${def.isBoss ? '是' : '否'}</li>
          <li>机体别名（兼容）：${def.body || '—'}</li>
        </ul>`;
      }
      if (kind === 'combatStyles') {
        const g = (def.groundKeys || []).join(' → ') || '—';
        const br = def.branches || {};
        const airN = Array.isArray(br.airNeutral) ? br.airNeutral.join(' / ') : '—';
        return `<h3>这条普攻链</h3><p class="hp-name">${def.id || '—'}</p><ul>
          <li>地面：${g}</li>
          <li>枝：冲刺 ${br.dash || '—'} · ↑ ${br.groundUp || '—'} · ↓ ${br.groundDown || '—'}</li>
          <li>空中：↓ ${br.airDown || '—'} · ↑ ${br.airUp || '—'} · 中性 ${airN}</li>
          <li>投技 ${br.throw || '—'} · 冲击波 ${def.plungeWaveKey || '—'}</li>
          <li>不开链窗：${(def.noChainOpen || []).join('、') || '（无）'}</li>
        </ul>`;
      }
      if (kind === 'weapons') {
        const feel = def.feel && def.feel.boxTune
          ? `tipXPush=${def.feel.boxTune.tipXPush ?? '—'} · tipWFloorMul=${def.feel.boxTune.tipWFloorMul ?? '—'}`
          : '（无 boxTune）';
        const look = def.lookId
          ? `外观 ${def.lookId}${(state.content.weaponLooks || []).some((x) => x.id === def.lookId) ? '（本卷已有）' : (((SCHEMA && SCHEMA.coreWeaponLookIds) || []).includes(def.lookId) ? '（长夜核心）' : '（需本卷或长夜登记）')}`
          : (def.parts && def.parts.length ? `内联 parts ×${def.parts.length}` : '无外观配方（回退形/色）');
        const style = def.combatStyleId
          ? `普攻链 ${def.combatStyleId}${(state.content.combatStyles || []).some((x) => x.id === def.combatStyleId) ? '（本卷已有）' : (['blade', 'bare'].includes(def.combatStyleId) ? '（长夜核心）' : '（需本卷或长夜登记）')}`
          : '普攻链（未挂 → 按类别默认 blade/bare）';
        return `<h3>这柄兵刃</h3><p class="hp-name">${def.name || def.id}</p><ul>
          <li>类别 ${def.category || '—'} · 形 ${def.shape || '—'} · 重量 ${def.weight || '—'}</li>
          <li>${look}</li>
          <li>${style}</li>
          <li>数值 伤${def.damage ?? '—'} / 速${def.speed ?? '—'} / 触${def.reach ?? '—'}</li>
          <li>克制 ${(def.affinities || []).join('、') || '—'}（+${def.affinityBonus ?? 0}）</li>
          <li>手感 ${feel}</li>
          <li>解锁 ${(def.unlock && def.unlock.type) || '—'} ${(def.unlock && def.unlock.hint) || ''}</li>
        </ul>`;
      }
      if (kind === 'skills') {
        const anim = def.castAnim
          ? `招式样子 <code>${def.castAnim}</code>${(state.content.animRecipes || []).some((x) => x.id === def.castAnim) ? '（本卷已有）' : (((SCHEMA && SCHEMA.coreAnimRecipeIds) || []).includes(def.castAnim) ? '（长夜核心）' : '（需本卷或长夜登记）')}`
          : '招式样子（未挂）';
        const fxArr = Array.isArray(def.castFx) ? def.castFx : [];
        const fxKinds = fxArr.map((s) => s && s.kind).filter(Boolean);
        const fxLine = fxArr.length
          ? `castFx ${fxArr.length} 步：${fxKinds.join(' · ')}`
          : 'castFx（未挂）';
        const ak = def.attackKey || '';
        const akInPack = ak && (state.content.attacks || []).some((x) => x.id === ak || x.name === ak);
        const akInCore = ak && ((SCHEMA && SCHEMA.coreAttackKeys) || []).includes(ak);
        const akNote = !ak
          ? ''
          : (akInPack ? '（本卷已有）' : (akInCore ? '（长夜核心）' : '（须在 ctx.attacks 目录登记）'));
        return `<h3>这门外功</h3><p class="hp-name">${def.name || def.id}</p><ul>
          <li>${def.kind || '—'} · ${def.castKind || '（无施放）'}</li>
          <li>攻击盒 <code>${ak || '—'}</code>${akNote} · 只认目录</li>
          <li>${anim}</li>
          <li>${fxLine}</li>
          <li>门控 ${def.weaponGate || '—'}</li>
          <li>内力 ${def.neiliCost ?? '—'} · 品质 ${def.quality || '—'}</li>
          <li>${def.tip || ''}</li>
        </ul>`;
      }
      if (kind === 'talismans') {
        const sid = def.scriptId || def.id || '';
        const scripts = state.content.talismanScripts || [];
        const scriptDef = sid ? scripts.find((x) => x.id === sid) : null;
        const hasScript = !!scriptDef;
        const scriptLine = sid
          ? `符效 <code>${escapeHtml(String(sid))}</code>${hasScript ? '（本卷已有）' : '（需本卷 talismanScripts）'}`
          : '符效（未挂 → 默认同 id）';
        const anim = def.anim
          ? `anim <code>${escapeHtml(String(def.anim))}</code>`
          : 'anim（未挂）';
        let stepsLine;
        if (hasScript) {
          const steps = Array.isArray(scriptDef.steps) ? scriptDef.steps : [];
          const kinds = steps.map((s) => s && s.kind).filter(Boolean);
          const uniq = [];
          for (const k of kinds) { if (!uniq.includes(k)) uniq.push(k); }
          const summary = uniq.length ? uniq.join(' · ') : '（无 kind）';
          stepsLine = `符效 ${steps.length} 步：${escapeHtml(summary)}`;
        } else if (sid) {
          stepsLine = '本卷无步骤 / 远程或核心脚本';
        } else {
          stepsLine = '符效步数（未挂 scriptId）';
        }
        const cost = def.cost && typeof def.cost === 'object'
          ? Object.entries(def.cost).map(([k, v]) => `${k}:${v}`).join(', ')
          : '—';
        return `<h3>这枚灵符</h3><p class="hp-name">${escapeHtml(def.name || def.id || '?')}</p><ul>
          <li>雾名 ${escapeHtml(def.fogName || '—')}</li>
          <li>${scriptLine}</li>
          <li>${anim}</li>
          <li>${stepsLine}</li>
          <li>材料 ${escapeHtml(cost)} · 费用 ${def.fee ?? '—'} · 库存 ${def.stockCap ?? '—'} · 每局 ${def.runCharges ?? '—'}</li>
          <li>品质 ${escapeHtml(def.quality || '—')} · 品级 ${escapeHtml(def.grade || '—')}</li>
          <li>${escapeHtml(def.tip || '')}</li>
        </ul>`;
      }
      return `<h3>${def.name || def.id}</h3><p class="muted">编号 ${def.id}</p>`;
    }
    return `<pre class="mini-json">${escapeHtml(JSON.stringify(def, null, 2))}</pre>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function paintPreview(section, def, extra) {
    const box = $(`#preview-${section}`);
    if (!box) return;
    let host = box.querySelector('.ink-preview-host');
    let text = box.querySelector('.human-text');
    if (!host || !text) {
      box.innerHTML = '';
      host = document.createElement('div');
      host.className = 'ink-preview-host';
      text = document.createElement('div');
      text.className = 'human-text';
      box.append(host, text);
    }
    text.innerHTML = humanPreview(section, def);
    if (window.DesignerPreview && typeof window.DesignerPreview.render === 'function') {
      const opts = Object.assign({ content: state.content }, extra || {});
      window.DesignerPreview.render(host, section, def, opts);
    } else {
      host.innerHTML = '<p class="muted">（预览脚本未载入）</p>';
    }
  }

  function updatePreview(section) {
    const list = state.content[section];
    const def = list && list[state.sel[section]];
    paintPreview(section, def);
  }

  /* ── Gameplay ──────────────────────────────────────────── */

  function gameplayFields(kind) {
    if (kind === 'poses' && SCHEMA.poses && Array.isArray(SCHEMA.poses.defFields)) {
      return SCHEMA.poses.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'fxRecipes' && SCHEMA.fxRecipes && Array.isArray(SCHEMA.fxRecipes.defFields)) {
      return SCHEMA.fxRecipes.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'emitter') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.fxEmitters && SCHEMA.fxEmitters.length)
            ? SCHEMA.fxEmitters.slice()
            : ['flare', 'ring', 'spark', 'qi', 'fire', 'dust', 'swordQi'];
        }
        return copy;
      });
    }
    if (kind === 'projectiles' && SCHEMA.projectiles && Array.isArray(SCHEMA.projectiles.defFields)) {
      return SCHEMA.projectiles.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'drawKind') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.projDrawKinds && SCHEMA.projDrawKinds.length)
            ? SCHEMA.projDrawKinds.slice()
            : ['arrow', 'fireball'];
        }
        if (copy.key === 'attackKey') {
          copy.type = 'string';
          copy.datalist = 'coreAttackKeys';
          const ids = attackKeyOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '')
            + (ids.length
              ? ('可选：本卷+核心共 ' + ids.length + ' 项；改伤害请挂攻击盒')
              : '缺省 arrow；改伤害请挂攻击盒');
        }
        return copy;
      });
    }
    if (kind === 'volleys' && SCHEMA.volleys && Array.isArray(SCHEMA.volleys.defFields)) {
      return SCHEMA.volleys.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'style') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.volleyStyles && SCHEMA.volleyStyles.length)
            ? SCHEMA.volleyStyles.slice()
            : ['skySword', 'thunder', 'waterPulse'];
        }
        return copy;
      });
    }
    if (kind === 'sheets' && SCHEMA.sheets && Array.isArray(SCHEMA.sheets.defFields)) {
      return SCHEMA.sheets.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'src') copy.artSrc = true;
        return copy;
      });
    }
    if (kind === 'sfx' && SCHEMA.sfx && Array.isArray(SCHEMA.sfx.defFields)) {
      return SCHEMA.sfx.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'synth') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.coreSynthIds && SCHEMA.coreSynthIds.length)
            ? SCHEMA.coreSynthIds.slice()
            : ['slash'];
        }
        if (copy.key === 'format') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.sfxFormats && SCHEMA.sfxFormats.length)
            ? SCHEMA.sfxFormats.slice()
            : ['wav', 'ogg', 'mp3'];
        }
        if (copy.key === 'src') copy.artSrc = true;
        return copy;
      });
    }
    if (kind === 'backdrops' && SCHEMA.backdrops && Array.isArray(SCHEMA.backdrops.defFields)) {
      return SCHEMA.backdrops.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'theme') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.backdropThemeIds && SCHEMA.backdropThemeIds.length)
            ? SCHEMA.backdropThemeIds.slice()
            : ['night', 'dock', 'ash', 'eclipse'];
        }
        return copy;
      });
    }
    if (kind === 'attacks' && SCHEMA.attacks && Array.isArray(SCHEMA.attacks.defFields)) {
      return SCHEMA.attacks.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'combatStyles' && SCHEMA.combatStyles && Array.isArray(SCHEMA.combatStyles.defFields)) {
      return SCHEMA.combatStyles.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'weapons' && SCHEMA.weapons && Array.isArray(SCHEMA.weapons.defFields)) {
      return SCHEMA.weapons.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'lookId') {
          copy.type = 'enum';
          const core = (SCHEMA && SCHEMA.coreWeaponLookIds) || [];
          const fromPack = (state.content.weaponLooks || []).map((x) => x.id).filter(Boolean);
          copy.enum = [...new Set([...core, ...fromPack])];
        }
        if (copy.key === 'combatStyleId') {
          copy.type = 'string';
          copy.datalist = 'combatStyleIds';
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + '可选：' + combatStyleIdOptions().join(' / ');
        }
        if (copy.key === 'affinities' && SCHEMA.affinities) {
          copy.hint = '闭集：' + SCHEMA.affinities.join(' / ');
        }
        return copy;
      });
    }
    if (kind === 'skills' && SCHEMA.skills && Array.isArray(SCHEMA.skills.defFields)) {
      return SCHEMA.skills.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'attackKey') {
          copy.type = 'string';
          copy.datalist = 'coreAttackKeys';
          const ids = attackKeyOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：本卷+核心共 ' + ids.length + ' 项') : '只认 ctx.attacks');
        }
        if (copy.key === 'castAnim') {
          copy.type = 'string';
          copy.datalist = 'animRecipeIds';
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + '可选：' + animRecipeIdOptions().join(' / ');
        }
        return copy;
      });
    }
    if (kind === 'talismans' && SCHEMA.talismans && Array.isArray(SCHEMA.talismans.defFields)) {
      return SCHEMA.talismans.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'scriptId') {
          copy.type = 'string';
          copy.datalist = 'talismanScriptIds';
          const ids = talismanScriptIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('本卷：' + ids.join(' / ')) : '先在「符效」页签建脚本');
        }
        if (copy.key === 'anim') {
          copy.type = 'string';
          copy.datalist = 'talismanAnimRecipeIds';
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + '可选：' + talismanAnimRecipeIdOptions().join(' / ');
        }
        if (copy.key === 'quality' && SCHEMA.inherentQualities) {
          copy.type = 'enum';
          copy.enum = SCHEMA.inherentQualities;
        }
        if (copy.key === 'grade' && SCHEMA.consumableGrades) {
          copy.type = 'enum';
          copy.enum = SCHEMA.consumableGrades;
        }
        return copy;
      });
    }
    if (kind === 'combatStyles') {
      return [
        { key: 'id', type: 'string', label: '编号', required: true },
        { key: 'groundKeys', type: 'stringList', label: '地面普攻链', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.dash', type: 'string', label: '冲刺枝', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.groundUp', type: 'string', label: '地上↑枝', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.groundDown', type: 'string', label: '地上↓枝', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.airDown', type: 'string', label: '空中↓枝', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.airUp', type: 'string', label: '空中↑枝', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.airNeutral', type: 'stringList', label: '空中中性（须 2 个）', required: true, datalist: 'coreAttackKeys' },
        { key: 'branches.finisherPoise', type: 'string', label: '破定终结', datalist: 'coreAttackKeys' },
        { key: 'branches.finisherDrain', type: 'string', label: '吸怒终结', datalist: 'coreAttackKeys' },
        { key: 'branches.throw', type: 'string', label: '投技枝', required: true, datalist: 'coreAttackKeys' },
        { key: 'noChainOpen', type: 'stringList', label: '不开链窗的招', required: true, datalist: 'coreAttackKeys' },
        { key: 'plungeWaveKey', type: 'string', label: '下落冲击波', datalist: 'coreAttackKeys' },
      ];
    }
    if (kind === 'weapons') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'category', type: 'enum', enum: SCHEMA.weaponCategories || ['bare', 'blade', 'spear', 'heavy'], label: '类别' },
        { key: 'shape', type: 'enum', enum: SCHEMA.bladeShapes, label: '形' },
        { key: 'weight', type: 'enum', enum: SCHEMA.weaponWeights || ['light', 'medium', 'heavy'], label: '重量档' },
        { key: 'length', type: 'number', label: '长度' },
        { key: 'blade', type: 'color', label: '刃色' },
        { key: 'trail', type: 'color', label: '拖影' },
        { key: 'edge', type: 'color', label: '刃锋' },
        { key: 'lookId', type: 'enum', enum: [...new Set([...((SCHEMA && SCHEMA.coreWeaponLookIds) || []), ...((state.content.weaponLooks || []).map((x) => x.id).filter(Boolean))])], label: '兵器长相编号' },
        { key: 'combatStyleId', type: 'string', label: '普攻链 Style', datalist: 'combatStyleIds' },
        { key: 'feel.boxTune.tipXPush', type: 'number', label: '手感·枪尖前推' },
      ];
    }
    if (kind === 'skills') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'tip', type: 'string', label: '提示' },
        { key: 'castKind', type: 'enum', enum: SCHEMA.skillCastKinds || ['attack'], label: '施放类型' },
        { key: 'attackKey', type: 'string', label: '攻击盒编号', datalist: 'coreAttackKeys' },
        { key: 'weaponGate', type: 'enum', enum: SCHEMA.weaponGates || ['any'], label: '兵器门控' },
        { key: 'castAnim', type: 'string', label: '招式样子编号', datalist: 'animRecipeIds' },
        { key: 'quality', type: 'enum', enum: SCHEMA.inherentQualities || ['fan'], label: '品质' },
      ];
    }
    if (kind === 'talismans') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'fogName', type: 'string', label: '雾名', required: true },
        { key: 'lore', type: 'string', label: '传闻', required: true },
        { key: 'tip', type: 'string', label: '提示', required: true },
        { key: 'color', type: 'color', label: '色', required: true },
        { key: 'cost', type: 'materialMap', label: '材料消耗', required: true, hint: 'cinnabar:2, silk:1' },
        { key: 'fee', type: 'number', label: '银钱费用', required: true, min: 0 },
        { key: 'stockCap', type: 'number', label: '库存上限', required: true, min: 0 },
        { key: 'runCharges', type: 'number', label: '每局次数', required: true, min: 0 },
        { key: 'scriptId', type: 'string', label: '符效编号', datalist: 'talismanScriptIds' },
        { key: 'anim', type: 'string', label: 'anim（覆盖脚本）', datalist: 'talismanAnimRecipeIds' },
        { key: 'quality', type: 'enum', enum: (SCHEMA && SCHEMA.inherentQualities) || ['fan'], label: '品质' },
        { key: 'grade', type: 'enum', enum: (SCHEMA && SCHEMA.consumableGrades) || ['shang', 'zhong', 'xia'], label: '品级' },
        { key: 'icon', type: 'string', label: '图标 key', hint: '禁外链；用 H-05-tal-* 或 ./art/…' },
      ];
    }
    if (kind === 'fxRecipes') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'emitter', type: 'enum', enum: ['flare', 'ring', 'spark', 'qi', 'fire', 'dust', 'swordQi'], label: '发射器', required: true },
        { key: 'color', type: 'color', label: '色' },
        { key: 'size', type: 'number', label: '大小' },
        { key: 'life', type: 'number', label: '寿命帧' },
        { key: 'n', type: 'number', label: '粒子数' },
        { key: 'heavy', type: 'boolean', label: '重效' },
      ];
    }
    if (kind === 'projectiles') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'drawKind', type: 'enum', enum: ['arrow', 'fireball'], label: '绘制种', required: true },
        { key: 'hitW', type: 'number', label: '碰撞宽', required: true },
        { key: 'hitH', type: 'number', label: '碰撞高', required: true },
        { key: 'attackKey', type: 'string', label: '伤害攻击盒', datalist: 'coreAttackKeys', hint: '可选；缺省=arrow（fireball→gFire）。改伤害请挂攻击盒' },
        { key: 'life', type: 'number', label: '寿命帧' },
        { key: 'explodeOnGround', type: 'boolean', label: '落地爆炸' },
        { key: 'trailEvery', type: 'number', label: '拖尾间隔' },
        { key: 'hitSfx', type: 'string', label: '命中音效 id' },
        { key: 'explodeSfx', type: 'string', label: '爆炸音效 id' },
      ];
    }
    if (kind === 'volleys') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'style', type: 'enum', enum: ['skySword', 'thunder', 'waterPulse'], label: '样式', required: true },
        { key: 'defaultCount', type: 'number', label: '默认次数' },
        { key: 'defaultInterval', type: 'number', label: '默认间隔帧' },
        { key: 'defaultSpread', type: 'number', label: '默认散布' },
        { key: 'defaultRadius', type: 'number', label: '默认半径' },
        { key: 'color', type: 'color', label: '色' },
      ];
    }
    if (kind === 'sheets') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'src', type: 'string', label: '路径 src', required: true, artSrc: true, hint: '须 ./art/…；禁外链' },
        { key: 'frameW', type: 'number', label: '帧宽' },
        { key: 'frameH', type: 'number', label: '帧高' },
        { key: 'frames', type: 'number', label: '帧数' },
        { key: 'maxBytes', type: 'number', label: '体素限额' },
      ];
    }
    if (kind === 'sfx') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'synth', type: 'enum', enum: (SCHEMA && SCHEMA.coreSynthIds) || ['slash'], label: '合成器 synth' },
        { key: 'src', type: 'string', label: '包内路径 src', artSrc: true, hint: '须 ./art/…（建议 ./art/audio/）；禁外链；文件放 public/art/audio/（馆包不送达）' },
        { key: 'format', type: 'enum', enum: ['wav', 'ogg', 'mp3'], label: '格式' },
      ];
    }
    if (kind === 'backdrops') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'theme', type: 'enum', enum: ['night', 'dock', 'ash', 'eclipse'], label: '生成器 theme', required: true },
        { key: 'skyTint', type: 'color', label: '天空色偏' },
        { key: 'fogTint', type: 'color', label: '雾色偏' },
        { key: 'groundTint', type: 'color', label: '地面色偏' },
        { key: 'label', type: 'string', label: '称谓' },
      ];
    }
    if (kind === 'poses') {
      const frames = [['wind', '蓄势'], ['strike', '击发'], ['rec', '收势']];
      const keys = [
        ['y', '纵偏'], ['lean', '倾身'], ['head', '头角'], ['rot', '扭转'],
        ['ft', '前大腿'], ['fk', '前膝'], ['bt', '后大腿'], ['bk', '后膝'],
        ['fa', '前上臂'], ['fe', '前肘'], ['ba', '后上臂'], ['be', '后肘'], ['w', '兵刃角'],
      ];
      const fields = [{ key: 'id', type: 'string', label: '编号（可改）', required: true }];
      for (const [frame, fl] of frames) {
        for (const [k, lab] of keys) {
          fields.push({ key: frame + '.' + k, type: 'number', label: fl + '·' + lab, required: true });
        }
      }
      return fields;
    }
    if (kind === 'attacks') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '内部名', required: true },
        { key: 'startup', type: 'number', label: '前摇帧', required: true },
        { key: 'active', type: 'number', label: '判定帧', required: true },
        { key: 'recovery', type: 'number', label: '后摇帧', required: true },
        { key: 'box.x', type: 'number', label: '盒·X', required: true },
        { key: 'box.y', type: 'number', label: '盒·Y', required: true },
        { key: 'box.w', type: 'number', label: '盒·宽', required: true },
        { key: 'box.h', type: 'number', label: '盒·高', required: true },
        { key: 'damage', type: 'number', label: '伤害', required: true },
        { key: 'kbX', type: 'number', label: '击退 X', required: true },
        { key: 'kbY', type: 'number', label: '击退 Y', required: true },
        { key: 'hitstun', type: 'number', label: '硬直' },
        { key: 'hitstop', type: 'number', label: '顿帧' },
        { key: 'shake', type: 'number', label: '震屏' },
        { key: 'parryable', type: 'boolean', label: '可招架' },
        { key: 'swing', type: 'enum', enum: ['slash', 'heavy', 'claw', 'bash', 'kick', 'whip', 'none'], label: '挥砍型' },
        { key: 'moveX', type: 'number', label: '前冲' },
        { key: 'moveFrames', type: 'number', label: '前冲帧' },
        { key: 'knockdown', type: 'boolean', label: '击倒' },
        { key: 'launch', type: 'boolean', label: '浮空' },
        { key: 'pierce', type: 'boolean', label: '穿刺' },
        { key: 'guardBreak', type: 'boolean', label: '破防' },
        { key: 'heavy', type: 'boolean', label: '重击' },
      ];
    }
    if (kind === 'bossMoves' && SCHEMA.bossMoves && Array.isArray(SCHEMA.bossMoves.defFields)) {
      return SCHEMA.bossMoves.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'kind') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.bossMoveKinds && SCHEMA.bossMoveKinds.length)
            ? SCHEMA.bossMoveKinds.slice()
            : ['claw','charge','fireball','dive','roar','walk','slam','sweep','summonAdds','inkNova'];
        }
        if (copy.key === 'side') {
          copy.type = 'enum';
          copy.enum = ['L', 'R', 'both'];
        }
        return copy;
      });
    }
    if (kind === 'bossMoves') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'kind', type: 'enum', enum: ['claw','charge','fireball','dive','roar','walk','slam','sweep','summonAdds','inkNova'], label: '原语 kind', required: true },
        { key: 'label', type: 'string', label: '称谓' },
        { key: 'radius', type: 'number', label: '半径' },
        { key: 'damage', type: 'number', label: '伤害' },
        { key: 'hitstop', type: 'number', label: '顿帧' },
        { key: 'width', type: 'number', label: '宽度' },
        { key: 'enemyId', type: 'string', label: '召卫敌寇 id' },
        { key: 'count', type: 'number', label: '召卫数量' },
        { key: 'side', type: 'enum', enum: ['L','R','both'], label: '召卫侧' },
        { key: 'frames', type: 'number', label: '帧数' },
        { key: 'color', type: 'color', label: '色' },
      ];
    }
    if (kind === 'bossKits' && SCHEMA.bossKits && Array.isArray(SCHEMA.bossKits.defFields)) {
      return SCHEMA.bossKits.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'bossKits') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
      ];
    }
    if (kind === 'eliteMods' && SCHEMA.eliteMods && Array.isArray(SCHEMA.eliteMods.defFields)) {
      return SCHEMA.eliteMods.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'summonEnemyId') {
          copy.type = 'string';
          copy.datalist = 'enemyIds';
          const ids = enemyIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：' + ids.join(' / ')) : '');
        }
        return copy;
      });
    }
    if (kind === 'eliteMods') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'color', type: 'color', label: '色标', required: true },
        { key: 'tag', type: 'string', label: '短标', required: true },
        { key: 'dmgTakenMul', type: 'number', label: '承伤倍率' },
        { key: 'reflect', type: 'number', label: '反伤比例' },
        { key: 'lifesteal', type: 'number', label: '吸血比例' },
        { key: 'heavyMul', type: 'number', label: '输出倍率' },
        { key: 'startupMul', type: 'number', label: '前摇倍率' },
        { key: 'dashAway', type: 'boolean', label: '闪步' },
        { key: 'fireOnDeath', type: 'boolean', label: '亡火' },
        { key: 'summonMinion', type: 'boolean', label: '召卫' },
        { key: 'summonEnemyId', type: 'string', label: '召卫敌寇 id', datalist: 'enemyIds' },
        { key: 'summonFire', type: 'boolean', label: '定期火圈' },
      ];
    }
    if (kind === 'fragments' && SCHEMA.fragments && Array.isArray(SCHEMA.fragments.defFields)) {
      return SCHEMA.fragments.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'tag') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.fragmentTags && SCHEMA.fragmentTags.length)
            ? SCHEMA.fragmentTags.slice()
            : ['qi', 'body', 'speed', 'sustain', 'curse'];
        }
        return copy;
      });
    }
    if (kind === 'fragments') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'fogName', type: 'string', label: '雾名', required: true },
        { key: 'desc', type: 'string', label: '描述', required: true },
        { key: 'color', type: 'color', label: '色标', required: true },
        { key: 'tag', type: 'enum', enum: ['qi','body','speed','sustain','curse'], label: '互斥标签', required: true },
        { key: 'curse', type: 'string', label: '诅咒文案' },
        { key: 'eventOnly', type: 'boolean', label: '仅事件' },
        { key: 'skillDmgMul', type: 'number', label: '外功伤倍率' },
        { key: 'neiliRegenMul', type: 'number', label: '内力回复倍率' },
        { key: 'armorPierceBonus', type: 'number', label: '破甲加成' },
        { key: 'dashCdMul', type: 'number', label: '闪身冷却倍率' },
        { key: 'pillHealMul', type: 'number', label: '丹药回复倍率' },
        { key: 'pillRageBonus', type: 'number', label: '丹药怒气加成' },
        { key: 'dmgTakenMul', type: 'number', label: '承伤倍率' },
        { key: 'atkMul', type: 'number', label: '全伤害倍率' },
      ];
    }
    if (kind === 'titles' && SCHEMA.titles && Array.isArray(SCHEMA.titles.defFields)) {
      return SCHEMA.titles.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'titles') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'desc', type: 'string', label: '达成条件', required: true },
        { key: 'qol', type: 'string', label: 'QoL 文案', required: true },
        { key: 'startPotions', type: 'number', label: '开局丹药 +N' },
        { key: 'parryWindowBonus', type: 'number', label: '弹反窗加成' },
        { key: 'shopDiscount', type: 'number', label: '商店折扣' },
      ];
    }
    if (kind === 'materials' && SCHEMA.materials && Array.isArray(SCHEMA.materials.defFields)) {
      return SCHEMA.materials.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'materials') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'lore', type: 'string', label: '传闻', required: true },
        { key: 'weight', type: 'number', label: '掉落相对权重', required: true },
        { key: 'rare', type: 'boolean', label: '稀有' },
      ];
    }
    if (kind === 'armorSets' && SCHEMA.armorSets && Array.isArray(SCHEMA.armorSets.defFields)) {
      return SCHEMA.armorSets.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'slots') {
          copy.type = 'stringList';
          copy.datalist = 'armorSlotIds';
          const slots = (SCHEMA.armorSlots && SCHEMA.armorSlots.length)
            ? SCHEMA.armorSlots.slice()
            : ['head', 'body', 'arms', 'legs', 'neck', 'ring', 'waist'];
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + ('闭集：' + slots.join(' / '));
        }
        return copy;
      });
    }
    if (kind === 'armorSets') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'fogName', type: 'string', label: '雾名', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'lore', type: 'string', label: '传闻', required: true },
        { key: 'slots', type: 'stringList', label: '可落槽位', required: true, datalist: 'armorSlotIds' },
        { key: 'weight', type: 'number', label: '掉落相对权重', required: true },
        { key: 'twoTip', type: 'string', label: '两件提示', required: true },
        { key: 'fullTip', type: 'string', label: '满件提示', required: true },
        { key: 'two.def', type: 'number', label: '两件·减伤' },
        { key: 'two.atk', type: 'number', label: '两件·攻击' },
        { key: 'full.def', type: 'number', label: '满件·减伤' },
        { key: 'full.atk', type: 'number', label: '满件·攻击' },
      ];
    }
    if (kind === 'armorPieces' && SCHEMA.armorPieces && Array.isArray(SCHEMA.armorPieces.defFields)) {
      return SCHEMA.armorPieces.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'slot') {
          copy.type = 'enum';
          copy.enum = (SCHEMA.armorSlots && SCHEMA.armorSlots.length)
            ? SCHEMA.armorSlots.slice()
            : ['head', 'body', 'arms', 'legs', 'neck', 'ring', 'waist'];
        }
        return copy;
      });
    }
    if (kind === 'armorPieces') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'slot', type: 'enum', enum: ['head','body','arms','legs','neck','ring','waist'], label: '槽位', required: true },
        { key: 'lore', type: 'string', label: '传闻', required: true },
        { key: 'base.hp', type: 'number', label: '底·生命' },
        { key: 'base.atk', type: 'number', label: '底·攻击' },
        { key: 'base.def', type: 'number', label: '底·减伤' },
        { key: 'base.rage', type: 'number', label: '底·气势' },
        { key: 'base.wugong', type: 'number', label: '底·武功%' },
        { key: 'weight', type: 'number', label: '掉落相对权重', required: true },
        { key: 'common', type: 'boolean', label: '常见' },
        { key: 'quality', type: 'enum', enum: ['tian','di','xuan','huang','fan','lie'], label: '固有品质提示' },
        { key: 'tier', type: 'number', label: '装备阶位 1–9', min: 1, max: 9 },
        { key: 'fogName', type: 'string', label: '雾名（可选）' },
      ];
    }
    if (kind === 'wepAffixes' && SCHEMA.wepAffixes && Array.isArray(SCHEMA.wepAffixes.defFields)) {
      return SCHEMA.wepAffixes.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'wepAffixes') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'fogName', type: 'string', label: '雾名', required: true },
        { key: 'tip', type: 'string', label: '提示', required: true },
        { key: 'poiseMul', type: 'number', label: '破韧倍率' },
        { key: 'lifesteal', type: 'number', label: '吸血比例' },
        { key: 'neiliOnHit', type: 'number', label: '命中回内' },
        { key: 'speedMul', type: 'number', label: '攻速倍率' },
        { key: 'heavyDmgMul', type: 'number', label: '重击伤倍率' },
        { key: 'staminaRefund', type: 'number', label: '体力返还' },
      ];
    }
    if (kind === 'affixes' && SCHEMA.affixes && Array.isArray(SCHEMA.affixes.defFields)) {
      return SCHEMA.affixes.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'evolveTo') {
          copy.type = 'string';
          copy.datalist = 'affixIds';
          const ids = affixIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：' + ids.slice(0, 8).join(' / ') + (ids.length > 8 ? ' …' : '')) : '');
        }
        return copy;
      });
    }
    if (kind === 'affixes') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'fogName', type: 'string', label: '雾名', required: true },
        { key: 'desc', type: 'string', label: '描述', required: true },
        { key: 'color', type: 'color', label: '色标', required: true },
        { key: 'primaryWeight', type: 'number', label: '主池权重' },
        { key: 'secondaryWeight', type: 'number', label: '副池权重' },
        { key: 'evolveOnly', type: 'boolean', label: '仅演化' },
        { key: 'dotPeriod', type: 'number', label: '毒雾·周期帧' },
        { key: 'dotDamage', type: 'number', label: '毒雾·伤害' },
        { key: 'evolveTo', type: 'string', label: '演化目标 id', datalist: 'affixIds' },
        { key: 'evolveAfter', type: 'number', label: '演化·帧数' },
      ];
    }
    if (kind === 'pills' && SCHEMA.pills && Array.isArray(SCHEMA.pills.defFields)) {
      return SCHEMA.pills.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'cost') {
          copy.type = 'materialMap';
          copy.datalist = 'materialIds';
        }
        return copy;
      });
    }
    if (kind === 'pills') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'lore', type: 'string', label: '传闻', required: true },
        { key: 'tip', type: 'string', label: '提示', required: true },
        { key: 'cost', type: 'materialMap', label: '炼制材料', required: true, datalist: 'materialIds' },
        { key: 'fee', type: 'number', label: '银钱费用', required: true },
        { key: 'carryCap', type: 'number', label: '携带上限', required: true },
        { key: 'quality', type: 'enum', enum: ['tian','di','xuan','huang','fan','lie'], label: '品质' },
        { key: 'grade', type: 'enum', enum: ['shang','zhong','xia'], label: '品级' },
        { key: 'sortie', type: 'boolean', label: '可出征' },
        { key: 'effect.heal', type: 'number', label: '效果·回血' },
        { key: 'effect.rage', type: 'number', label: '效果·气势' },
        { key: 'effect.floatText', type: 'string', label: '效果·飘字' },
        { key: 'effect.sfx', type: 'enum', enum: ['potion','ui'], label: '效果·音效' },
      ];
    }
    if (kind === 'neigong' && SCHEMA.neigong && Array.isArray(SCHEMA.neigong.defFields)) {
      return SCHEMA.neigong.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'meditateCost') {
          copy.type = 'materialMap';
          copy.datalist = 'materialIds';
        }
        return copy;
      });
    }
    if (kind === 'neigong') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'name', type: 'string', label: '名称', required: true },
        { key: 'lore', type: 'string', label: '传闻', required: true },
        { key: 'tip', type: 'string', label: '提示', required: true },
        { key: 'signature', type: 'string', label: '满级签名', required: true },
        { key: 'style', type: 'string', label: '路数', required: true },
        { key: 'meditateCost', type: 'materialMap', label: '打坐材料', required: true, datalist: 'materialIds' },
        { key: 'fee', type: 'number', label: '银钱费用', required: true },
        { key: 'quality', type: 'enum', enum: ['tian','di','xuan','huang','fan','lie'], label: '品质' },
        { key: 'effects.damageBonus', type: 'numberList', label: '效果·武功加成[]', required: true },
        { key: 'effects.rageBonus', type: 'numberList', label: '效果·气势加成[]', required: true },
        { key: 'effects.defBonus', type: 'numberList', label: '效果·减伤加成[]', required: true },
        { key: 'effects.neiliRegenMul', type: 'numberList', label: '效果·内力回复倍率[]', required: true },
        { key: 'effects.executeMulBonus', type: 'number', label: '签名·处决加成' },
      ];
    }
    if (kind === 'colliders' && SCHEMA.colliders && Array.isArray(SCHEMA.colliders.defFields)) {
      return SCHEMA.colliders.defFields.map((f) => ({ ...f }));
    }
    if (kind === 'colliders') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）', required: true },
        { key: 'label', type: 'string', label: '称谓' },
        { key: 'w', type: 'number', label: '宽（≥1）', required: true },
        { key: 'h', type: 'number', label: '高（≥1）', required: true },
        { key: 'hurtInset', type: 'number', label: '受击内缩' },
        { key: 'gravityScale', type: 'number', label: '重力倍率' },
      ];
    }
    if (kind === 'enemies' && SCHEMA.enemies && Array.isArray(SCHEMA.enemies.defFields)) {
      return SCHEMA.enemies.defFields.map((f) => {
        const copy = { ...f };
        if (copy.key === 'behaviorId') {
          copy.type = 'string';
          copy.datalist = 'behaviorIds';
          const ids = behaviorIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：' + ids.join(' / ')) : '');
        }
        if (copy.key === 'silhouetteId') {
          copy.type = 'string';
          copy.datalist = 'silhouetteIds';
          const ids = silhouetteIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：' + ids.join(' / ')) : '');
        }
        if (copy.key === 'colliderId') {
          copy.type = 'string';
          copy.datalist = 'colliderIds';
          const ids = colliderIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：' + ids.join(' / ')) : '');
        }
        if (copy.key === 'kitId') {
          copy.type = 'string';
          copy.datalist = 'bossKitIds';
          const ids = bossKitIdOptions();
          copy.hint = (copy.hint ? copy.hint + ' · ' : '') + (ids.length ? ('可选：' + ids.join(' / ')) : '');
        }
        return copy;
      });
    }
    if (kind === 'enemies') {
      return [
        { key: 'id', type: 'string', label: '编号（可改）' },
        { key: 'name', type: 'string', label: '名称' },
        { key: 'body', type: 'enum', enum: SCHEMA.bodies.map((b) => b.id), label: '机体' },
        { key: 'hp', type: 'number', label: '气血' },
        { key: 'isBoss', type: 'boolean', label: '是 Boss' },
        { key: 'silhouetteId', type: 'string', label: '长相编号', datalist: 'silhouetteIds' },
        { key: 'behaviorId', type: 'string', label: '打法编号', datalist: 'behaviorIds' },
        { key: 'colliderId', type: 'string', label: '碰撞盒编号', datalist: 'colliderIds' },
        { key: 'kitId', type: 'string', label: '怎么凶 kitId', datalist: 'bossKitIds' },
        { key: 'dropChance', type: 'number', label: '掉落率' },
      ];
    }
    return [];
  }

  /** BossKit close/far 加权表（轻量；datalist 提示；运行期缺失 warn+跳过） */
  function renderBossKitWeights(def, root) {
    if (!Array.isArray(def.close)) def.close = [];
    if (!Array.isArray(def.far)) def.far = [];

    const wrap = document.createElement('div');
    wrap.className = 'bosskit-weights';
    wrap.style.cssText = 'margin-top:1rem;grid-column:1/-1;';

    const title = document.createElement('h3');
    title.style.cssText = 'margin:0 0 0.35rem;font-size:0.85rem;letter-spacing:0.18em;color:var(--moon-soft)';
    title.textContent = '怎么凶 · 近距 / 远距加权';
    wrap.append(title);

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.style.margin = '0 0 0.55rem';
    hint.textContent = (SCHEMA && SCHEMA.bossKits && SCHEMA.bossKits.note)
      || 'move 为招式 id（本卷或长夜）；weight≥0。roar 填就绪权重，冷却时运行时清零。不做战斗预览。';
    wrap.append(hint);

    const moveOpts = bossMoveIdOptions();

    const renderBand = (bandKey, bandLabel) => {
      const band = document.createElement('div');
      band.style.cssText = 'margin-bottom:0.85rem;';
      const head = document.createElement('div');
      head.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;margin-bottom:0.4rem;';
      const h = document.createElement('strong');
      h.textContent = bandLabel;
      h.style.letterSpacing = '0.12em';
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-ink';
      addBtn.textContent = '＋ 加一行';
      addBtn.addEventListener('click', () => {
        def[bandKey].push({ move: moveOpts[0] || 'claw', weight: 1 });
        renderGameplay();
        toast(bandLabel + ' 已加一行');
      });
      head.append(h, addBtn);
      band.append(head);

      const list = def[bandKey];
      if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-recipe';
        empty.textContent = '尚无权重 · 点「加一行」';
        band.append(empty);
      }
      list.forEach((row, ri) => {
        const card = document.createElement('div');
        card.className = 'step-card';
        const fields = document.createElement('div');
        fields.className = 'step-fields';
        fields.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end;';

        const moveLab = document.createElement('label');
        moveLab.className = 'field';
        moveLab.innerHTML = '<span>招式 id</span>';
        const moveIn = document.createElement('input');
        moveIn.type = 'text';
        moveIn.value = row.move || '';
        moveIn.placeholder = 'claw / slam_heavy …';
        attachDatalist(moveIn, { datalist: 'bossMoveIds' });
        moveIn.addEventListener('change', () => {
          row.move = moveIn.value.trim() || undefined;
          renderGameplaySelectOnly();
          refreshExportPreview();
          paintPreview('gameplay', def, { gpKind: 'bossKits' });
        });
        moveLab.append(moveIn);

        const wLab = document.createElement('label');
        wLab.className = 'field';
        wLab.innerHTML = '<span>权重</span>';
        const wIn = document.createElement('input');
        wIn.type = 'number';
        wIn.min = '0';
        wIn.step = '0.1';
        wIn.value = row.weight != null ? String(row.weight) : '';
        wIn.addEventListener('change', () => {
          const n = Number(wIn.value);
          row.weight = Number.isFinite(n) ? n : undefined;
          renderGameplaySelectOnly();
          refreshExportPreview();
          paintPreview('gameplay', def, { gpKind: 'bossKits' });
        });
        wLab.append(wIn);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-ink danger-soft';
        del.textContent = '删';
        del.addEventListener('click', () => {
          list.splice(ri, 1);
          renderGameplay();
          toast('已删权重行');
        });

        fields.append(moveLab, wLab, del);
        card.append(fields);
        band.append(card);
      });
      wrap.append(band);
    };

    renderBand('close', '近距 close');
    renderBand('far', '远距 far');
    root.append(wrap);
  }

  function renderGameplay() {
    const kind = state.gpKind;
    const list = state.content[kind];
    const sel = $('#sel-gp-item') || $('#sel-gameplay');
    if (!sel) return;
    sel.innerHTML = '';
    if (!list.length) {
      const o = document.createElement('option');
      o.textContent = '（空）';
      o.value = '-1';
      sel.append(o);
    } else {
      list.forEach((d, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        let label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}`;
        if (kind === 'combatStyles' && Array.isArray(d.groundKeys) && d.groundKeys.length) {
          label = `${d.id || '?'} · ${d.groundKeys.length} 段链`;
        }
        if (kind === 'attacks' && d.damage != null) {
          label = `${d.id || '?'}${d.name && d.name !== d.id ? ' · ' + d.name : ''} · 伤${d.damage}`;
        }
        if (kind === 'fxRecipes' && d.emitter) {
          label = `${d.id || '?'} · ${d.emitter}`;
        }
        if (kind === 'projectiles' && d.drawKind) {
          label = `${d.id || '?'} · ${d.drawKind} · ${d.hitW || '?'}×${d.hitH || '?'}`
            + (d.attackKey ? ` · 伤:${d.attackKey}` : '');
        }
        if (kind === 'volleys' && d.style) {
          label = `${d.id || '?'} · ${d.style}${d.defaultInterval != null ? ' · 隔' + d.defaultInterval : ''}`;
        }
        if (kind === 'sheets' && d.src) {
          label = `${d.id || '?'} · ${d.src}`;
        }
        if (kind === 'sfx') {
          label = `${d.id || '?'}${d.synth ? ' · synth:' + d.synth : (d.src ? ' · src' : '')}`;
        }
        if (kind === 'backdrops' && d.theme) {
          label = `${d.id || '?'}${d.label ? ' · ' + d.label : ''} · ${d.theme}`;
        }
        if (kind === 'poses') {
          const lean = d.strike && d.strike.lean != null ? d.strike.lean : '—';
          const loco = /^(hp|sp)\./.test(String(d.id || '')) ? ' · loco' : '';
          label = `${d.id || '?'}${loco} · 击发 lean ${lean}`;
        }
        if (kind === 'colliders' && d.w != null && d.h != null) {
          label = `${d.id || '?'}${d.label ? ' · ' + d.label : ''} · ${d.w}×${d.h}`;
        }
        if (kind === 'bossMoves' && d.kind) {
          label = `${d.id || '?'}${d.label ? ' · ' + d.label : ''} · ${d.kind}`;
        }
        if (kind === 'bossKits') {
          const n = (Array.isArray(d.close) ? d.close.length : 0) + (Array.isArray(d.far) ? d.far.length : 0);
          label = `${d.id || '?'} · 权 ${n}`;
        }
        if (kind === 'eliteMods') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.tag ? ' · ' + d.tag : ''}`;
        }
        if (kind === 'fragments' && d.tag) {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''} · ${d.tag}`;
        }
        if (kind === 'titles') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}`;
        }
        if (kind === 'materials') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.rare ? ' · 稀' : ''}`;
        }
        if (kind === 'armorSets') {
          const n = Array.isArray(d.slots) ? d.slots.length : 0;
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''} · 槽${n}`;
        }
        if (kind === 'armorPieces' && d.slot) {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''} · ${d.slot}`;
        }
        if (kind === 'wepAffixes') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}`;
        }
        if (kind === 'affixes') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.dotPeriod != null ? ' · 毒' + d.dotPeriod : ''}`;
        }
        if (kind === 'pills') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.sortie ? ' · 出征' : ''}`;
        }
        if (kind === 'neigong') {
          label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.style ? ' · ' + d.style : ''}`;
        }
        o.textContent = label;
        if (i === state.gpSel) o.selected = true;
        sel.append(o);
      });
    }

    const root = $('#editor-gameplay');
    root.innerHTML = '';
    if (!list.length) {
      root.innerHTML = '<div class="empty-recipe">此类尚无条目</div>';
      paintPreview('gameplay', null, { gpKind: kind });
      return;
    }
    state.gpSel = Math.min(state.gpSel, list.length - 1);
    const def = list[state.gpSel];
    if (kind === 'poses') {
      const copyRow = document.createElement('div');
      copyRow.className = 'form-grid';
      copyRow.style.marginBottom = '0.75rem';
      const lab = document.createElement('label');
      lab.className = 'field';
      const span = document.createElement('span');
      span.textContent = '从核心拷贝再改';
      span.title = '覆盖本条 wind/strike/rec；保留当前 id';
      lab.append(span);
      const selCore = document.createElement('select');
      selCore.className = 'ink-select';
      const ids = (SCHEMA && SCHEMA.corePoseIds) || [];
      for (const id of ids) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = id;
        if (id === 'slash1') o.selected = true;
        selCore.append(o);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-ink';
      btn.textContent = '拷贝三帧';
      btn.addEventListener('click', () => {
        const pid = selCore.value;
        const templates = (SCHEMA && SCHEMA.corePoseTemplates) || {};
        const tpl = templates[pid];
        if (!tpl) {
          toast('核心无此姿态：' + pid);
          return;
        }
        const keepId = def.id;
        const clone = deepClone(tpl);
        def.wind = clone.wind;
        def.strike = clone.strike;
        def.rec = clone.rec;
        def.id = keepId;
        toast('已从核心「' + pid + '」拷贝三帧（id 未改）');
        renderGameplay();
        refreshExportPreview();
      });
      lab.append(selCore);
      copyRow.append(lab);
      const btnWrap = document.createElement('div');
      btnWrap.style.display = 'flex';
      btnWrap.style.alignItems = 'flex-end';
      btnWrap.style.gap = '0.5rem';
      btnWrap.append(btn);
      // Loco3: one-click copy strike → wind/rec (loco recommends same three frames; runtime reads strike only)
      const btnFill = document.createElement('button');
      btnFill.type = 'button';
      btnFill.className = 'btn-ink';
      btnFill.textContent = '三帧同填 strike';
      btnFill.title = '把 wind/rec 覆写为当前 strike（locomotion 建议同填；运行时 locoPose 只读 strike）';
      btnFill.addEventListener('click', () => {
        if (!def.strike || typeof def.strike !== 'object') {
          toast('本条无 strike 可填');
          return;
        }
        const clone = deepClone(def.strike);
        def.wind = deepClone(clone);
        def.rec = deepClone(clone);
        toast('已将 wind / rec 同填为当前 strike');
        renderGameplay();
        refreshExportPreview();
      });
      btnWrap.append(btnFill);
      copyRow.append(btnWrap);
      root.append(copyRow);
    }
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    for (const f of gameplayFields(kind)) {
      const fake = { ...f, key: f.key };
      // reuse renderer but need label override
      const node = renderFieldInput(fake, def, () => {
        renderGameplaySelectOnly();
        refreshExportPreview();
      });
      node.querySelector('span').textContent = f.label || f.key;
      grid.append(node);
    }
    root.append(grid);
    if (kind === 'skills') {
      renderSkillCastFx(def, root);
    }
    if (kind === 'bossKits') {
      renderBossKitWeights(def, root);
    }
    paintPreview('gameplay', def, { gpKind: kind });
    window.__designerRerenderGameplay = () => renderGameplay();
  }

  function renderGameplaySelectOnly() {
    const kind = state.gpKind;
    const list = state.content[kind];
    const sel = $('#sel-gp-item') || $('#sel-gameplay');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '';
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      let label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}`;
      if (kind === 'combatStyles' && Array.isArray(d.groundKeys) && d.groundKeys.length) {
        label = `${d.id || '?'} · ${d.groundKeys.length} 段链`;
      }
      if (kind === 'fxRecipes' && d.emitter) {
        label = `${d.id || '?'} · ${d.emitter}`;
      }
      if (kind === 'poses') {
        const lean = d.strike && d.strike.lean != null ? d.strike.lean : '—';
        const loco = /^(hp|sp)\./.test(String(d.id || '')) ? ' · loco' : '';
        label = `${d.id || '?'}${loco} · 击发 lean ${lean}`;
      }
      if (kind === 'colliders' && d.w != null && d.h != null) {
        label = `${d.id || '?'}${d.label ? ' · ' + d.label : ''} · ${d.w}×${d.h}`;
      }
      if (kind === 'bossMoves' && d.kind) {
        label = `${d.id || '?'}${d.label ? ' · ' + d.label : ''} · ${d.kind}`;
      }
      if (kind === 'bossKits') {
        const n = (Array.isArray(d.close) ? d.close.length : 0) + (Array.isArray(d.far) ? d.far.length : 0);
        label = `${d.id || '?'} · 权 ${n}`;
      }
      if (kind === 'eliteMods') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.tag ? ' · ' + d.tag : ''}`;
      }
      if (kind === 'fragments' && d.tag) {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''} · ${d.tag}`;
      }
      if (kind === 'titles') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}`;
      }
      if (kind === 'materials') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.rare ? ' · 稀' : ''}`;
      }
      if (kind === 'armorSets') {
        const n = Array.isArray(d.slots) ? d.slots.length : 0;
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''} · 槽${n}`;
      }
      if (kind === 'armorPieces' && d.slot) {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''} · ${d.slot}`;
      }
      if (kind === 'wepAffixes') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}`;
      }
      if (kind === 'affixes') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.dotPeriod != null ? ' · 毒' + d.dotPeriod : ''}`;
      }
      if (kind === 'pills') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.sortie ? ' · 出征' : ''}`;
      }
      if (kind === 'neigong') {
        label = `${d.id || '?'}${d.name ? ' · ' + d.name : ''}${d.style ? ' · ' + d.style : ''}`;
      }
      o.textContent = label;
      if (String(i) === cur || i === state.gpSel) o.selected = true;
      sel.append(o);
    });
  }


  /* ── Stages / 关卡导演 ─────────────────────────────────── */

  function enemyTypeOptions() {
    const core = (SCHEMA && SCHEMA.coreEnemyIds) || ['axe', 'shield', 'archer', 'spear', 'gargoyle'];
    const fromPack = (state.content.enemies || []).map((e) => e.id).filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const id of [...core, ...fromPack]) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  function emptySpawn() {
    const opts = enemyTypeOptions();
    return { type: opts.includes('axe') ? 'axe' : (opts[0] || 'axe'), side: 'R', delay: 0 };
  }

  function emptyArena(n = 0) {
    return {
      name: `场地${n + 1}`,
      x0: 520 + n * 1400,
      trigger: 860 + n * 1400,
      waves: [[emptySpawn()], [emptySpawn()]],
    };
  }

  function emptyBoss() {
    return {
      name: '决战关口',
      x0: 4760,
      trigger: 5040,
      bossName: '无名石兽',
      bossSubtitle: '石影苏醒',
      bossId: 'gargoyle',
      hpScale: 1,
      dmgScale: 1,
      tint: 'jade',
    };
  }

  function emptyStage() {
    const n = state.content.stages.length;
    return {
      id: `act_custom_${Date.now().toString(36).slice(-4)}`,
      actIndex: n,
      title: `第${n + 1}幕 · 未名`,
      subtitle: '纸上新关',
      length: 5800,
      start: 220,
      backdropTheme: 'night',
      arenas: [emptyArena(0), emptyArena(1)],
      boss: emptyBoss(),
      platforms: [],
      beats: [],
    };
  }

  function ensureStageShape(st) {
    if (!Array.isArray(st.arenas)) st.arenas = [];
    if (!st.boss || typeof st.boss !== 'object') st.boss = emptyBoss();
    if (!Array.isArray(st.platforms)) st.platforms = [];
    if (!Array.isArray(st.beats)) st.beats = [];
    for (const a of st.arenas) {
      if (!Array.isArray(a.waves)) a.waves = [[]];
      a.waves = a.waves.map((w) => (Array.isArray(w) ? w : []));
    }
  }

  function bindNum(input, obj, key, onChange) {
    input.type = 'number';
    input.step = 'any';
    input.value = obj[key] != null ? obj[key] : '';
    input.addEventListener('change', () => {
      const v = coerceValue('number', input.value, {});
      if (v === undefined) delete obj[key];
      else obj[key] = v;
      onChange();
    });
  }

  function bindText(input, obj, key, onChange) {
    input.type = 'text';
    input.value = obj[key] ?? '';
    input.addEventListener('change', () => {
      const v = String(input.value || '').trim();
      if (!v && key !== 'subtitle' && key !== 'bossSubtitle' && key !== 'backdropTheme') {
        /* keep required-ish as empty string for export clarity */
      }
      obj[key] = input.value;
      onChange();
    });
  }

  function mkField(labelText, inputEl) {
    const lab = document.createElement('label');
    lab.className = 'field';
    const span = document.createElement('span');
    span.textContent = labelText;
    lab.append(span, inputEl);
    return lab;
  }

  function enemyTypeSelect(cur, onPick) {
    const sel = document.createElement('select');
    const opts = enemyTypeOptions();
    if (cur && !opts.includes(cur)) {
      const o = document.createElement('option');
      o.value = cur;
      o.textContent = `${cur}（自填）`;
      o.selected = true;
      sel.append(o);
    }
    for (const id of opts) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = id;
      if (id === cur) o.selected = true;
      sel.append(o);
    }
    const custom = document.createElement('option');
    custom.value = '__custom__';
    custom.textContent = '…自填';
    sel.append(custom);
    sel.addEventListener('change', () => {
      if (sel.value === '__custom__') {
        const v = prompt('敌寇 type / id', cur || '');
        if (v != null && v.trim()) onPick(v.trim());
        else onPick(cur || 'axe');
        return;
      }
      onPick(sel.value);
    });
    return sel;
  }

  function renderStages() {
    const sel = $('#sel-stages');
    const root = $('#editor-stages');
    if (!sel || !root) return;
    const list = state.content.stages;
    sel.innerHTML = '';
    if (!list.length) {
      const o = document.createElement('option');
      o.value = '-1';
      o.textContent = '（尚无幕次）';
      sel.append(o);
      root.innerHTML = '<div class="empty-recipe">尚无幕次 · 点「新幕」或「载入骨架」</div>';
      refreshExportPreview();
      paintPreview('stages', null);
      return;
    }
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `${d.id || '?'} · ${d.title || ''}（act ${d.actIndex ?? i}）`;
      if (i === state.stageSel) o.selected = true;
      sel.append(o);
    });
    state.stageSel = Math.min(Math.max(0, state.stageSel), list.length - 1);
    const st = list[state.stageSel];
    ensureStageShape(st);
    root.innerHTML = '';

    const redraw = () => {
      renderStages();
      refreshExportPreview();
    };

    /* meta */
    const meta = document.createElement('div');
    meta.className = 'form-grid';
    const metaFields = [
      ['id', '幕号 id', 'text'],
      ['actIndex', '幕序 actIndex', 'number'],
      ['title', '标题', 'text'],
      ['subtitle', '副标题', 'text'],
      ['length', '关长 length', 'number'],
      ['start', '起点 start', 'number'],
      ['backdropTheme', '背景 theme', 'theme'],
    ];
    for (const [key, label, typ] of metaFields) {
      if (typ === 'theme') {
        const input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('list', 'backdrop-theme-list');
        input.placeholder = 'night|dock|ash|eclipse';
        input.value = st[key] ?? '';
        input.addEventListener('change', () => { st[key] = input.value; redraw(); });
        meta.append(mkField(label, input));
      } else if (typ === 'number') {
        const input = document.createElement('input');
        bindNum(input, st, key, () => { renderStagesSelectOnly(); refreshExportPreview(); });
        meta.append(mkField(label, input));
      } else {
        const input = document.createElement('input');
        bindText(input, st, key, () => { renderStagesSelectOnly(); refreshExportPreview(); });
        meta.append(mkField(label, input));
      }
    }
    let dl = $('#backdrop-theme-list');
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = 'backdrop-theme-list';
      document.body.append(dl);
    }
    // R2b：本卷 backdrops + 核心 theme/id
    dl.innerHTML = '';
    for (const t of backdropIdOptions()) {
      const o = document.createElement('option');
      o.value = t;
      dl.append(o);
    }
    root.append(meta);

    /* arenas */
    const arenasHead = document.createElement('div');
    arenasHead.className = 'stage-section-head';
    arenasHead.innerHTML = '<h3>Arenas · 浪次</h3>';
    const addArena = document.createElement('button');
    addArena.type = 'button';
    addArena.className = 'btn-ink';
    addArena.textContent = '＋ 场地';
    addArena.addEventListener('click', () => {
      st.arenas.push(emptyArena(st.arenas.length));
      redraw();
      toast('已加场地');
    });
    arenasHead.append(addArena);
    root.append(arenasHead);

    st.arenas.forEach((arena, ai) => {
      const card = document.createElement('div');
      card.className = 'step-card stage-arena';
      const head = document.createElement('div');
      head.className = 'step-head';
      head.innerHTML = `<span class="step-kind">场地 ${ai + 1}</span><span class="step-label">${arena.name || ''}</span>`;
      const actions = document.createElement('div');
      actions.className = 'step-actions';
      const delA = document.createElement('button');
      delA.type = 'button';
      delA.textContent = '删场地';
      delA.addEventListener('click', () => {
        st.arenas.splice(ai, 1);
        redraw();
      });
      actions.append(delA);
      head.append(actions);
      card.append(head);

      const aGrid = document.createElement('div');
      aGrid.className = 'form-grid';
      for (const [key, label, typ] of [['name', '名称', 'text'], ['x0', 'x0', 'number'], ['trigger', 'trigger', 'number']]) {
        const input = document.createElement('input');
        if (typ === 'number') bindNum(input, arena, key, () => refreshExportPreview());
        else bindText(input, arena, key, () => { renderStagesSelectOnly(); refreshExportPreview(); });
        aGrid.append(mkField(label, input));
      }
      // D1：精英偏重 — materialMap 形；datalist = 本卷+核心 eliteMods
      {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'tongpi:3, shanbu:1';
        input.value = formatMaterialMap(arena.eliteWeight);
        attachDatalist(input, { datalist: 'eliteModIds' });
        input.title = '本卷 eliteMods + 长夜核心 id';
        input.addEventListener('change', () => {
          const v = parseMaterialMap(input.value);
          if (!v) delete arena.eliteWeight;
          else arena.eliteWeight = v;
          refreshExportPreview();
          paintPreview('stages', st);
        });
        aGrid.append(mkField('精英偏重 eliteWeight', input));
      }
      // D3：场地偏味 — stringList；datalist = 本卷+核心 affixes（导演接线另单）
      {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'duwu, nifeng';
        input.value = Array.isArray(arena.affixBias) ? arena.affixBias.join(', ') : '';
        attachDatalist(input, { datalist: 'affixIds' });
        input.title = '本卷 affixes + 长夜核心 id（导演接线另单·债#5；本期仅备存）';
        input.addEventListener('change', () => {
          const v = String(input.value || '')
            .split(/[,，\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (!v.length) delete arena.affixBias;
          else arena.affixBias = v;
          refreshExportPreview();
          paintPreview('stages', st);
        });
        aGrid.append(mkField('场地偏味 affixBias', input));
      }
      card.append(aGrid);

      const wavesWrap = document.createElement('div');
      wavesWrap.className = 'stage-waves';
      const wToolbar = document.createElement('div');
      wToolbar.className = 'recipe-toolbar';
      const wTitle = document.createElement('span');
      wTitle.className = 'stage-sublabel';
      wTitle.textContent = '浪次 waves[][]';
      const addWave = document.createElement('button');
      addWave.type = 'button';
      addWave.className = 'btn-ink';
      addWave.textContent = '＋ 浪';
      addWave.addEventListener('click', () => {
        if (!Array.isArray(arena.waves)) arena.waves = [];
        arena.waves.push([emptySpawn()]);
        redraw();
      });
      wToolbar.append(wTitle, addWave);
      wavesWrap.append(wToolbar);

      (arena.waves || []).forEach((wave, wi) => {
        const wCard = document.createElement('div');
        wCard.className = 'stage-wave';
        const wh = document.createElement('div');
        wh.className = 'step-head';
        wh.innerHTML = `<span class="step-kind">浪 ${wi + 1}</span>`;
        const wa = document.createElement('div');
        wa.className = 'step-actions';
        const addSpawn = document.createElement('button');
        addSpawn.type = 'button';
        addSpawn.textContent = '＋ Spawn';
        addSpawn.addEventListener('click', () => {
          wave.push(emptySpawn());
          redraw();
        });
        const delWave = document.createElement('button');
        delWave.type = 'button';
        delWave.textContent = '删浪';
        delWave.addEventListener('click', () => {
          arena.waves.splice(wi, 1);
          redraw();
        });
        wa.append(addSpawn, delWave);
        wh.append(wa);
        wCard.append(wh);

        const table = document.createElement('div');
        table.className = 'stage-spawn-table';
        wave.forEach((sp, si) => {
          const row = document.createElement('div');
          row.className = 'stage-spawn-row';
          const typeSel = enemyTypeSelect(sp.type, (v) => {
            sp.type = v;
            redraw();
          });
          const sideSel = document.createElement('select');
          for (const s of ['L', 'R']) {
            const o = document.createElement('option');
            o.value = s;
            o.textContent = s;
            if (sp.side === s) o.selected = true;
            sideSel.append(o);
          }
          sideSel.addEventListener('change', () => {
            sp.side = sideSel.value;
            refreshExportPreview();
          });
          const delay = document.createElement('input');
          bindNum(delay, sp, 'delay', () => refreshExportPreview());
          delay.title = 'delay';
          const del = document.createElement('button');
          del.type = 'button';
          del.textContent = '删';
          del.addEventListener('click', () => {
            wave.splice(si, 1);
            redraw();
          });
          row.append(
            mkField('type', typeSel),
            mkField('side', sideSel),
            mkField('delay', delay),
            del,
          );
          table.append(row);
        });
        wCard.append(table);
        wavesWrap.append(wCard);
      });
      card.append(wavesWrap);
      root.append(card);
    });

    /* boss */
    const bossHead = document.createElement('div');
    bossHead.className = 'stage-section-head';
    bossHead.innerHTML = '<h3>Boss 遭遇</h3>';
    root.append(bossHead);
    const bossGrid = document.createElement('div');
    bossGrid.className = 'form-grid';
    const boss = st.boss;
    const bossFields = [
      ['name', '关口名', 'text'],
      ['x0', 'x0', 'number'],
      ['trigger', 'trigger', 'number'],
      ['bossName', 'Boss 名', 'text'],
      ['bossSubtitle', 'Boss 副标', 'text'],
      ['bossId', 'bossId', 'enemy'],
      ['kit', '怎么凶（kit）', 'kit'],
      ['hpScale', '气血倍率', 'number'],
      ['dmgScale', '伤害倍率', 'number'],
      ['tint', '染色', 'tint'],
    ];
    for (const [key, label, typ] of bossFields) {
      if (typ === 'enemy') {
        bossGrid.append(mkField(label, enemyTypeSelect(boss[key], (v) => {
          boss[key] = v;
          redraw();
        })));
      } else if (typ === 'kit') {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = boss.kit || '';
        input.placeholder = 'stone / demo_yexun …';
        attachDatalist(input, { datalist: 'bossKitIds' });
        input.addEventListener('change', () => {
          const v = input.value.trim();
          if (!v) delete boss.kit;
          else boss.kit = v;
          refreshExportPreview();
          updatePreview('stages');
        });
        bossGrid.append(mkField(label, input));
      } else if (typ === 'tint') {
        const sel = document.createElement('select');
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '—';
        sel.append(empty);
        for (const t of (SCHEMA.stages?.bossTints || ['jade', 'ink', 'blood', 'ash'])) {
          const o = document.createElement('option');
          o.value = t;
          o.textContent = t;
          if (boss.tint === t) o.selected = true;
          sel.append(o);
        }
        sel.addEventListener('change', () => {
          if (!sel.value) delete boss.tint;
          else boss.tint = sel.value;
          refreshExportPreview();
        });
        bossGrid.append(mkField(label, sel));
      } else if (typ === 'number') {
        const input = document.createElement('input');
        bindNum(input, boss, key, () => refreshExportPreview());
        bossGrid.append(mkField(label, input));
      } else {
        const input = document.createElement('input');
        bindText(input, boss, key, () => refreshExportPreview());
        bossGrid.append(mkField(label, input));
      }
    }
    root.append(bossGrid);

    /* platforms */
    const platHead = document.createElement('div');
    platHead.className = 'stage-section-head';
    platHead.innerHTML = '<h3>Platforms · 平台</h3>';
    const addPlat = document.createElement('button');
    addPlat.type = 'button';
    addPlat.className = 'btn-ink';
    addPlat.textContent = '＋ 平台';
    addPlat.addEventListener('click', () => {
      st.platforms.push({ x: 580, y: 372, w: 170, h: 96, kind: 'roof' });
      redraw();
    });
    platHead.append(addPlat);
    root.append(platHead);

    const platTable = document.createElement('div');
    platTable.className = 'stage-plat-table';
    if (!st.platforms.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-recipe';
      empty.textContent = '无平台 · 载入骨架可带核心几何，或手工增行';
      platTable.append(empty);
    }
    st.platforms.forEach((pl, pi) => {
      const row = document.createElement('div');
      row.className = 'stage-spawn-row';
      for (const key of ['x', 'y', 'w', 'h']) {
        const input = document.createElement('input');
        bindNum(input, pl, key, () => refreshExportPreview());
        row.append(mkField(key, input));
      }
      const kindSel = document.createElement('select');
      const emptyK = document.createElement('option');
      emptyK.value = '';
      emptyK.textContent = '—';
      kindSel.append(emptyK);
      for (const k of (SCHEMA.stages?.platformKinds || ['roof', 'bridge', 'pavilion'])) {
        const o = document.createElement('option');
        o.value = k;
        o.textContent = k;
        if (pl.kind === k) o.selected = true;
        kindSel.append(o);
      }
      kindSel.addEventListener('change', () => {
        if (!kindSel.value) delete pl.kind;
        else pl.kind = kindSel.value;
        refreshExportPreview();
      });
      row.append(mkField('kind', kindSel));
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '删';
      del.addEventListener('click', () => {
        st.platforms.splice(pi, 1);
        redraw();
      });
      row.append(del);
      platTable.append(row);
    });
    root.append(platTable);

    const beatsNote = document.createElement('p');
    beatsNote.className = 'hint';
    beatsNote.textContent = 'beats 叙事默认 []（可于导出 JSON 手工补）；本台以浪次与 Boss 为主。';
    root.append(beatsNote);

    paintPreview('stages', st);
    refreshExportPreview();
  }

  function renderStagesSelectOnly() {
    const sel = $('#sel-stages');
    if (!sel) return;
    const list = state.content.stages;
    const cur = String(state.stageSel);
    sel.innerHTML = '';
    list.forEach((d, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `${d.id || '?'} · ${d.title || ''}（act ${d.actIndex ?? i}）`;
      if (String(i) === cur) o.selected = true;
      sel.append(o);
    });
  }


  /* ── Acts / 幕池（整幕默认；与 stages 分栏）───────────────── */

  function ensureActsShape() {
    if (!state.content.acts || typeof state.content.acts !== 'object' || Array.isArray(state.content.acts)) {
      state.content.acts = { pools: [], beats: [] };
    }
    if (!Array.isArray(state.content.acts.pools)) state.content.acts.pools = [];
    if (!Array.isArray(state.content.acts.beats)) state.content.acts.beats = [];
  }

  function emptyActPool() {
    ensureActsShape();
    const n = state.content.acts.pools.length;
    const kitOpts = bossKitIdOptions();
    const kit = kitOpts.includes('stone') ? 'stone' : (kitOpts[0] || 'stone');
    return {
      actIndex: n,
      kit,
      tint: 'jade',
      eliteWeights: { tongpi: 2, shanbu: 3, zhongji: 1 },
      dropLean: ['iron', 'bone'],
      blueprintLean: ['silver', 'thorn'],
      setLean: ['tiegu'],
      loreLine: '纸上新幕，钟声未歇。',
    };
  }

  function emptyActBeat() {
    ensureActsShape();
    const n = state.content.acts.beats.length;
    return {
      fromAct: n,
      id: `betweenActs.demo.${n + 1}to${n + 2}`,
      when: 'betweenActs',
      title: '夜色更深…',
      subtitle: '设计台试笔幕间',
      holdFrames: 160,
      slowmo: 0.5,
    };
  }

  function renderActsSelectOnly() {
    ensureActsShape();
    const selP = $('#sel-act-pools');
    const selB = $('#sel-act-beats');
    if (selP) {
      const list = state.content.acts.pools;
      const cur = String(state.actPoolSel);
      selP.innerHTML = '';
      if (!list.length) {
        const o = document.createElement('option');
        o.value = '-1';
        o.textContent = '（尚无幕池）';
        selP.append(o);
      } else {
        list.forEach((d, i) => {
          const o = document.createElement('option');
          o.value = String(i);
          o.textContent = `act ${d.actIndex ?? i} · ${d.kit || '?'} · ${(d.loreLine || '').slice(0, 12)}`;
          if (String(i) === cur) o.selected = true;
          selP.append(o);
        });
      }
    }
    if (selB) {
      const list = state.content.acts.beats;
      const cur = String(state.actBeatSel);
      selB.innerHTML = '';
      if (!list.length) {
        const o = document.createElement('option');
        o.value = '-1';
        o.textContent = '（尚无幕间）';
        selB.append(o);
      } else {
        list.forEach((d, i) => {
          const o = document.createElement('option');
          o.value = String(i);
          o.textContent = `from ${d.fromAct ?? i} · ${d.title || d.id || '?'}`;
          if (String(i) === cur) o.selected = true;
          selB.append(o);
        });
      }
    }
  }

  function renderActs() {
    ensureActsShape();
    const rootP = $('#editor-act-pools');
    const rootB = $('#editor-act-beats');
    if (!rootP || !rootB) return;
    const pools = state.content.acts.pools;
    const beats = state.content.acts.beats;
    renderActsSelectOnly();

    const redraw = () => {
      renderActs();
      refreshExportPreview();
    };

    /* ── pools editor ── */
    rootP.innerHTML = '';
    if (!pools.length) {
      rootP.innerHTML = '<div class="empty-recipe">尚无幕池 · 点「新幕池」覆盖某一幕默认权重/Lore</div>';
      paintPreview('acts', null);
    } else {
      state.actPoolSel = Math.min(Math.max(0, state.actPoolSel), pools.length - 1);
      const pool = pools[state.actPoolSel];
      const grid = document.createElement('div');
      grid.className = 'form-grid';

      // actIndex
      {
        const input = document.createElement('input');
        bindNum(input, pool, 'actIndex', () => { renderActsSelectOnly(); refreshExportPreview(); paintPreview('acts', pool); });
        grid.append(mkField('幕序 actIndex', input));
      }
      // kit (datalist bossKitIds)
      {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = pool.kit ?? '';
        input.placeholder = 'stone|rain|tomb|night 或本卷 kit';
        attachDatalist(input, { datalist: 'bossKitIds' });
        input.title = '核心 + 本卷 bossKits（开放 string · Act1.5）';
        input.addEventListener('change', () => {
          pool.kit = String(input.value || '').trim() || 'stone';
          renderActsSelectOnly();
          refreshExportPreview();
          paintPreview('acts', pool);
        });
        grid.append(mkField('整幕默认怎么凶 kit', input));
      }
      // tint enum
      {
        const sel = document.createElement('select');
        const tints = (SCHEMA && SCHEMA.acts && SCHEMA.acts.tints) || ['jade', 'ink', 'blood', 'ash'];
        for (const t of tints) {
          const o = document.createElement('option');
          o.value = t;
          o.textContent = t;
          if (t === pool.tint) o.selected = true;
          sel.append(o);
        }
        if (pool.tint && !tints.includes(pool.tint)) {
          const o = document.createElement('option');
          o.value = pool.tint;
          o.textContent = `${pool.tint}（自填）`;
          o.selected = true;
          sel.prepend(o);
        }
        sel.addEventListener('change', () => {
          pool.tint = sel.value;
          refreshExportPreview();
          paintPreview('acts', pool);
        });
        grid.append(mkField('染色 tint', sel));
      }
      // eliteWeights materialMap
      {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'tongpi:3, shanbu:1';
        input.value = formatMaterialMap(pool.eliteWeights);
        attachDatalist(input, { datalist: 'eliteModIds' });
        input.title = '本卷 eliteMods + 长夜核心（整幕默认；单场可覆盖）';
        input.addEventListener('change', () => {
          const v = parseMaterialMap(input.value);
          pool.eliteWeights = v || {};
          refreshExportPreview();
          paintPreview('acts', pool);
        });
        grid.append(mkField('整幕精英偏重 eliteWeights', input));
      }
      // dropLean / blueprintLean / setLean stringLists
      for (const [key, label, dl] of [
        ['dropLean', '材料偏向 dropLean', 'materialIds'],
        ['blueprintLean', '图纸偏向 blueprintLean', 'weaponIds'],
        ['setLean', '套装偏向 setLean', 'armorSetIds'],
      ]) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = Array.isArray(pool[key]) ? pool[key].join(', ') : '';
        attachDatalist(input, { datalist: dl });
        input.addEventListener('change', () => {
          const v = String(input.value || '')
            .split(/[,，\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          pool[key] = v;
          refreshExportPreview();
          paintPreview('acts', pool);
        });
        grid.append(mkField(label, input));
      }
      // loreLine
      {
        const input = document.createElement('input');
        bindText(input, pool, 'loreLine', () => {
          renderActsSelectOnly();
          refreshExportPreview();
          paintPreview('acts', pool);
        });
        grid.append(mkField('开幕 Lore', input));
      }
      rootP.append(grid);
      paintPreview('acts', pool);
    }

    /* ── beats editor ── */
    rootB.innerHTML = '';
    if (!beats.length) {
      rootB.innerHTML = '<div class="empty-recipe">尚无幕间字幕 · 点「新幕间」（when 锁 betweenActs）</div>';
      if (!pools.length) paintPreview('acts', null);
    } else {
      state.actBeatSel = Math.min(Math.max(0, state.actBeatSel), beats.length - 1);
      const beat = beats[state.actBeatSel];
      // lock when
      if (beat.when !== 'betweenActs') beat.when = 'betweenActs';
      const grid = document.createElement('div');
      grid.className = 'form-grid';
      {
        const input = document.createElement('input');
        bindNum(input, beat, 'fromAct', () => { renderActsSelectOnly(); refreshExportPreview(); paintPreview('acts', Object.assign({ __kind: 'beat' }, beat)); });
        grid.append(mkField('离开的幕序 fromAct', input));
      }
      {
        const input = document.createElement('input');
        bindText(input, beat, 'id', () => { renderActsSelectOnly(); refreshExportPreview(); });
        grid.append(mkField('字幕 id', input));
      }
      {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'betweenActs';
        input.readOnly = true;
        input.title = '幕间锁 betweenActs；场内 when 请走关卡 beats';
        grid.append(mkField('时机 when（锁）', input));
      }
      {
        const input = document.createElement('input');
        bindText(input, beat, 'title', () => { renderActsSelectOnly(); refreshExportPreview(); paintPreview('acts', Object.assign({ __kind: 'beat' }, beat)); });
        grid.append(mkField('标题', input));
      }
      {
        const input = document.createElement('input');
        bindText(input, beat, 'subtitle', () => { refreshExportPreview(); paintPreview('acts', Object.assign({ __kind: 'beat' }, beat)); });
        grid.append(mkField('副标题', input));
      }
      {
        const input = document.createElement('input');
        bindNum(input, beat, 'holdFrames', () => refreshExportPreview());
        grid.append(mkField('停留帧 holdFrames', input));
      }
      {
        const input = document.createElement('input');
        bindNum(input, beat, 'slowmo', () => refreshExportPreview());
        grid.append(mkField('慢镜 slowmo', input));
      }
      rootB.append(grid);
      if (!pools.length) paintPreview('acts', Object.assign({ __kind: 'beat' }, beat));
    }
    refreshExportPreview();
  }


  /* ── IO ────────────────────────────────────────────────── */

  function refreshExportPreview() {
    const pre = $('#export-preview');
    if (!pre) return;
    pre.textContent = JSON.stringify(buildUploadPayload(), null, 2);
  }

  function importPayload(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('非对象');
    let pack = obj.pack;
    let content = obj.content;
    // raw pack.json shape
    if (!pack && obj.id && (obj.kind === 'pack' || obj.kind === 'menpai')) {
      pack = obj;
      content = {};
    }
    // raw content-only
    if (!pack && !content && (obj.attacks || obj.poses || obj.fxRecipes || obj.projectiles || obj.volleys || obj.sheets || obj.sfx || obj.backdrops || obj.combatStyles || obj.weaponLooks || obj.weapons || obj.skills || obj.talismanScripts || obj.talismans || obj.enemies || obj.animRecipes || obj.stages || obj.acts || obj.colliders || obj.silhouettes || obj.behaviors || obj.bossMoves || obj.bossKits || obj.eliteMods || obj.fragments || obj.titles || obj.materials || obj.armorSets || obj.armorPieces || obj.wepAffixes || obj.affixes || obj.pills || obj.neigong)) {
      content = obj;
      pack = null;
    }
    if (pack) {
      state.pack = {
        id: pack.id || state.pack.id,
        kind: pack.kind === 'menpai' ? 'menpai' : 'pack',
        name: pack.name || '',
        version: pack.version || '0.1.0',
        description: pack.description || '',
        tags: Array.isArray(pack.tags) ? pack.tags.slice() : [],
        builtin: Boolean(pack.builtin),
      };
    }
    if (content && typeof content === 'object') {
      for (const k of Object.keys(state.content)) {
        if (k === 'acts') continue; // nested object — handled below
        if (Array.isArray(content[k])) state.content[k] = deepClone(content[k]);
      }
      // Act2：acts 嵌套 { pools, beats }（非数组顶键）
      if (content.acts && typeof content.acts === 'object' && !Array.isArray(content.acts)) {
        state.content.acts = {
          pools: Array.isArray(content.acts.pools) ? deepClone(content.acts.pools) : [],
          beats: Array.isArray(content.acts.beats) ? deepClone(content.acts.beats) : [],
        };
      }
    }
    // reset selections
    for (const k of Object.keys(state.sel)) state.sel[k] = 0;
    state.gpSel = 0;
    state.stageSel = 0;
    state.actPoolSel = 0;
    state.actBeatSel = 0;
    renderMeta();
    for (const s of Object.keys(LIST_KEYS)) renderRecipeEditor(s);
    renderGameplay();
    renderStages();
    renderActs();
    refreshExportPreview();
    toast('已回填设计台');
  }

  /* ── Wire UI ───────────────────────────────────────────── */

  function showWorkbench(show) {
    const home = $('#wizard-home');
    const tabs = $('#designer-tabs');
    const main = $('#designer-main');
    if (home) home.hidden = !!show;
    if (tabs) tabs.hidden = !show;
    if (main) main.hidden = !show;
  }

  function switchPanel(name) {
    if (name === 'home') {
      showWorkbench(false);
      return;
    }
    showWorkbench(true);
    $$('.designer-tabs .tab').forEach((t) => {
      const on = t.dataset.panel === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.panel').forEach((p) => {
      const on = p.id === `panel-${name}`;
      p.classList.toggle('active', on);
      p.hidden = !on;
    });
  }

  function runWizard(kind) {
    if (kind === 'enemy') {
      // ensure linked silhouette + behavior + enemy；自建攻击盒可挂 attackKey
      if (!state.content.attacks.length) {
        state.content.attacks.push(emptyGameplay('attacks'));
        state.content.attacks[0].id = 'demo_cleave';
        state.content.attacks[0].name = 'demo_cleave';
      }
      if (!state.content.silhouettes.length) {
        state.content.silhouettes.push(emptyDef('silhouettes'));
        state.content.silhouettes[0].label = '新敌长相';
      }
      if (!state.content.behaviors.length) {
        state.content.behaviors.push(emptyDef('behaviors'));
        state.content.behaviors[0].label = '新敌打法';
        // 若本卷已有自建盒则挂之，否则挂长夜目录 thrust（只认 ctx.attacks）
        const packAtk = (state.content.attacks || []).map((x) => x.id).filter(Boolean)[0] || 'thrust';
        state.content.behaviors[0].steps = [
          { kind: 'keepDistance', idealMin: 80, idealMax: 150, chase: 220 },
          { kind: 'meleeAttack', attackKey: packAtk, rangeMax: 160, weight: 2 },
          { kind: 'facePlayer' },
        ];
      }
      if (!state.content.colliders.length) {
        state.content.colliders.push(emptyDef('colliders'));
        state.content.colliders[0].label = '新敌碰撞';
        state.content.colliders[0].w = 32;
        state.content.colliders[0].h = 82;
      }
      if (!state.content.enemies.length) {
        const sil = state.content.silhouettes[0];
        const beh = state.content.behaviors[0];
        const col = state.content.colliders[0];
        state.content.enemies.push({
          id: `enemy_${Date.now().toString(36).slice(-5)}`,
          name: '未名敌寇',
          body: sil.body || 'spear',
          hp: 60,
          silhouetteId: sil.id,
          behaviorId: beh.id,
          colliderId: col.id,
          dropChance: 0.2,
          eliteEligible: true,
        });
      }
      state.sel.silhouettes = 0;
      state.sel.behaviors = 0;
      state.gpKind = 'enemies';
      state.gpSel = 0;
      renderRecipeEditor('silhouettes');
      renderRecipeEditor('behaviors');
      renderGameplay();
      switchPanel('behaviors');
      toast('已备好敌寇草稿：先调「怎么打」，再去长相/玩法目录');
      return;
    }
    if (kind === 'weapon') {
      if (!state.content.weaponLooks.length) {
        state.content.weaponLooks.push(emptyDef('weaponLooks'));
        state.content.weaponLooks[0].label = '新兵刃长相';
        state.content.weaponLooks[0].parts = [
          { kind: 'palette', blade: '#c8d0e8', trail: '#7090c0', edge: '#e8f0ff', grip: '#2a2430' },
          { kind: 'grip', length: 9, width: 3 },
          { kind: 'guard', style: 'cross', width: 10 },
          { kind: 'blade', profile: 'curved', lengthFrac: 1 },
          { kind: 'tip', style: 'point' },
          { kind: 'inkEdge' },
        ];
      }
      if (!state.content.combatStyles.length) {
        const cs = emptyGameplay('combatStyles');
        cs.id = 'demo_chain';
        state.content.combatStyles.push(cs);
      }
      if (!state.content.weapons.length) {
        const w = emptyGameplay('weapons');
        w.lookId = state.content.weaponLooks[0].id;
        w.combatStyleId = state.content.combatStyles[0].id;
        state.content.weapons.push(w);
      } else {
        if (!state.content.weapons[0].lookId) {
          state.content.weapons[0].lookId = state.content.weaponLooks[0].id;
        }
        if (!state.content.weapons[0].combatStyleId) {
          state.content.weapons[0].combatStyleId = state.content.combatStyles[0].id;
        }
      }
      if (!state.content.skills.length) {
        state.content.skills.push(emptyGameplay('skills'));
      }
      state.sel.weaponLooks = 0;
      state.gpKind = 'weapons';
      state.gpSel = 0;
      renderRecipeEditor('weaponLooks');
      renderGameplay();
      switchPanel('weaponLooks');
      toast('已备兵刃草稿：先调「兵器长相」，再去玩法目录挂 lookId / Style / 外功');
      return;
    }
    if (kind === 'moves') {
      if (!state.content.animRecipes.length) {
        state.content.animRecipes.push(emptyDef('animRecipes'));
      }
      if (!state.content.talismanScripts.length) {
        const sc = emptyDef('talismanScripts');
        sc.id = 'demo_cone';
        sc.label = '试笔锥斩';
        sc.anim = 'sealBurst';
        sc.steps = [
          { kind: 'banner', text: '灵符', sub: '试笔锥斩', dur: 80 },
          { kind: 'flash', color: '#ffe0a0', a: 0.2 },
          { kind: 'sfx', id: 'slash' },
          { kind: 'damageCone', reach: 160, halfH: 50, damage: 16 },
          { kind: 'shake', amp: 3, frames: 6 },
        ];
        state.content.talismanScripts.push(sc);
      }
      if (!state.content.talismans.length) {
        const t = emptyGameplay('talismans');
        t.id = 'demo_fu';
        t.name = '试笔符';
        t.fogName = '灵符·试??';
        t.lore = '设计台默认示范符：挂本卷 demo_cone（含 damageCone）。';
        t.tip = '出征：身前锥击试笔';
        t.color = '#c8a060';
        t.cost = { cinnabar: 1, silk: 1 };
        t.fee = 10;
        t.stockCap = 2;
        t.runCharges = 1;
        t.scriptId = 'demo_cone';
        t.anim = 'sealBurst';
        t.quality = 'fan';
        t.grade = 'xia';
        state.content.talismans.push(t);
      }
      state.sel.talismanScripts = 0;
      renderRecipeEditor('talismanScripts');
      renderGameplay();
      switchPanel('talismanScripts');
      toast('已备符效草稿：左侧点积木（含 damageCone/banner）；玩法目录「符」挂 scriptId');
      return;
    }
    if (kind === 'stage') {
      if (!state.content.stages.length) {
        state.content.stages.push(emptyStage());
      }
      state.stageSel = 0;
      renderStages();
      switchPanel('stages');
      toast('开始排浪次');
    }

    if (kind === 'acts') {
      ensureActsShape();
      if (!state.content.bossKits.length) {
        // kit datalist 需要本卷样例时与首访同构
        state.content.bossKits.push({
          id: 'demo_yexun',
          close: [
            { move: 'claw', weight: 3 },
            { move: 'demo_slam_heavy', weight: 5 },
            { move: 'sweep', weight: 1.5 },
            { move: 'roar', weight: 1.4 },
          ],
          far: [
            { move: 'fireball', weight: 2 },
            { move: 'dive', weight: 2 },
            { move: 'demo_slam_heavy', weight: 3 },
            { move: 'inkNova', weight: 1.2 },
            { move: 'walk', weight: 1 },
          ],
        });
      }
      if (!state.content.acts.pools.length) {
        const pool = emptyActPool();
        pool.actIndex = 0;
        pool.kit = (state.content.bossKits || []).some((x) => x.id === 'demo_yexun') ? 'demo_yexun' : 'stone';
        pool.loreLine = '设计台试笔·山门新钟。';
        pool.eliteWeights = { tongpi: 2, shanbu: 5, zhongji: 1, fanshang: 1, shixue: 1, xiehuo: 1 };
        state.content.acts.pools.push(pool);
      }
      if (!state.content.acts.beats.length) {
        const beat = emptyActBeat();
        beat.fromAct = 0;
        beat.id = 'betweenActs.demo.1to2';
        beat.title = '试笔幕间';
        beat.subtitle = '设计台试灌 betweenActs';
        state.content.acts.beats.push(beat);
      }
      state.actPoolSel = 0;
      state.actBeatSel = 0;
      renderActs();
      switchPanel('acts');
      toast('开始编幕池');
    }
  }

  function wire() {
    $$('.designer-tabs .tab').forEach((tab) => {
      tab.addEventListener('click', () => switchPanel(tab.dataset.panel));
    });
    $$('.wizard-card').forEach((btn) => {
      btn.addEventListener('click', () => runWizard(btn.dataset.wizard));
    });
    $$('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => switchPanel(btn.dataset.goto));
    });
    $('#btn-toggle-json')?.addEventListener('click', () => {
      const pre = $('#export-preview');
      if (!pre) return;
      pre.hidden = !pre.hidden;
      if (!pre.hidden) refreshExportPreview();
    });

    for (const section of Object.keys(LIST_KEYS)) {
      $(`[data-add-recipe="${section}"]`)?.addEventListener('click', () => {
        state.content[section].push(emptyDef(section));
        state.sel[section] = state.content[section].length - 1;
        renderRecipeEditor(section);
        toast('已开新配方');
      });
      $(`[data-del-recipe="${section}"]`)?.addEventListener('click', () => {
        const list = state.content[section];
        if (!list.length) return;
        list.splice(state.sel[section], 1);
        state.sel[section] = Math.max(0, state.sel[section] - 1);
        renderRecipeEditor(section);
        toast('已删配方');
      });
      $(`#sel-${section}`)?.addEventListener('change', (e) => {
        state.sel[section] = Number(e.target.value) || 0;
        renderRecipeEditor(section);
      });
    }

    $('#sel-gp-kind')?.addEventListener('change', (e) => {
      state.gpKind = e.target.value;
      state.gpSel = 0;
      renderGameplay();
    });
    $('#btn-gp-add')?.addEventListener('click', () => {
      state.content[state.gpKind].push(emptyGameplay(state.gpKind));
      state.gpSel = state.content[state.gpKind].length - 1;
      renderGameplay();
    });
    $('#btn-gp-del')?.addEventListener('click', () => {
      const list = state.content[state.gpKind];
      if (!list.length) return;
      list.splice(state.gpSel, 1);
      state.gpSel = Math.max(0, state.gpSel - 1);
      renderGameplay();
    });
    $('#sel-gp-item')?.addEventListener('change', (e) => {
      state.gpSel = Number(e.target.value) || 0;
      renderGameplay();
    });
    // legacy ids if present
    $('#gp-add')?.addEventListener('click', () => $('#btn-gp-add')?.click());
    $('#sel-gameplay')?.addEventListener('change', (e) => {
      state.gpSel = Number(e.target.value) || 0;
      renderGameplay();
    });


    $('#btn-stage-add')?.addEventListener('click', () => {
      state.content.stages.push(emptyStage());
      state.stageSel = state.content.stages.length - 1;
      renderStages();
      toast('已开新幕');
    });
    $('#btn-stage-del')?.addEventListener('click', () => {
      const list = state.content.stages;
      if (!list.length) return;
      list.splice(state.stageSel, 1);
      state.stageSel = Math.max(0, state.stageSel - 1);
      renderStages();
      toast('已删幕');
    });
    $('#sel-stages')?.addEventListener('change', (e) => {
      state.stageSel = Number(e.target.value) || 0;
      renderStages();
    });

    $('#btn-act-pool-add')?.addEventListener('click', () => {
      ensureActsShape();
      state.content.acts.pools.push(emptyActPool());
      state.actPoolSel = state.content.acts.pools.length - 1;
      renderActs();
      toast('已加幕池');
    });
    $('#btn-act-pool-del')?.addEventListener('click', () => {
      ensureActsShape();
      const list = state.content.acts.pools;
      if (!list.length) return;
      list.splice(state.actPoolSel, 1);
      state.actPoolSel = Math.max(0, state.actPoolSel - 1);
      renderActs();
      toast('已删幕池');
    });
    $('#sel-act-pools')?.addEventListener('change', (e) => {
      state.actPoolSel = Number(e.target.value) || 0;
      renderActs();
    });
    $('#btn-act-beat-add')?.addEventListener('click', () => {
      ensureActsShape();
      state.content.acts.beats.push(emptyActBeat());
      state.actBeatSel = state.content.acts.beats.length - 1;
      renderActs();
      toast('已加幕间');
    });
    $('#btn-act-beat-del')?.addEventListener('click', () => {
      ensureActsShape();
      const list = state.content.acts.beats;
      if (!list.length) return;
      list.splice(state.actBeatSel, 1);
      state.actBeatSel = Math.max(0, state.actBeatSel - 1);
      renderActs();
      toast('已删幕间');
    });
    $('#sel-act-beats')?.addEventListener('change', (e) => {
      state.actBeatSel = Number(e.target.value) || 0;
      renderActs();
    });

    $('#stage-load-skel')?.addEventListener('click', async () => {
      const key = $('#stage-skeleton')?.value;
      if (!key) { toast('先选 act1–4'); return; }
      try {
        if (!STAGE_SKELS) {
          const res = await fetch('/assets/stage-skeletons.json', { cache: 'no-store' });
          if (!res.ok) throw new Error(`骨架 ${res.status}`);
          STAGE_SKELS = await res.json();
        }
        const sk = STAGE_SKELS[key];
        if (!sk) throw new Error(`无 ${key}`);
        const clone = deepClone(sk);
        // if editing existing, replace in place; else push
        if (state.content.stages.length && state.stageSel >= 0 && state.stageSel < state.content.stages.length) {
          state.content.stages[state.stageSel] = clone;
        } else {
          state.content.stages.push(clone);
          state.stageSel = state.content.stages.length - 1;
        }
        // suggest stage tag
        if (!state.pack.tags.includes('stage')) state.pack.tags.push('stage');
        renderMeta();
        renderStages();
        toast(`已载入 ${key} 骨架 · 可改浪次/Boss`);
      } catch (err) {
        toast(`载入失败：${err.message || err}`);
      }
    });

    $('#btn-dl-pack')?.addEventListener('click', () => {
      const p = buildPackExport();
      if (!ID_RE.test(p.id)) { toast('卷号不合规'); return; }
      downloadJson('pack.json', p);
    });
    $('#btn-dl-content')?.addEventListener('click', () => {
      downloadJson('content.json', buildContentExport());
    });
    $('#btn-dl-both')?.addEventListener('click', () => {
      const p = buildPackExport();
      if (!ID_RE.test(p.id)) { toast('卷号不合规'); return; }
      downloadJson(`${p.id}-pack.json`, p);
      downloadJson(`${p.id}-content.json`, buildContentExport());
    });
    $('#btn-copy-upload')?.addEventListener('click', async () => {
      const text = JSON.stringify(buildUploadPayload(), null, 2);
      try {
        await navigator.clipboard.writeText(text);
        toast('已复制入藏 JSON');
      } catch {
        $('#import-text').value = text;
        toast('剪贴板不可用，已写入导入框');
      }
    });

    const tokenInput = $('#upload-token');
    if (tokenInput) {
      tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || '';
      tokenInput.addEventListener('change', () => {
        sessionStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
      });
    }
    $('#btn-upload')?.addEventListener('click', async () => {
      const token = ($('#upload-token')?.value || '').trim();
      const status = $('#upload-status');
      if (!token) {
        status.textContent = '请先填入令牌（本页 sessionStorage）。';
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, token);
      const payload = buildUploadPayload();
      if (!ID_RE.test(payload.pack.id)) {
        status.textContent = '卷号不合规。';
        return;
      }
      status.textContent = '正投卷…';
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          status.textContent = `失败 ${res.status}：${data.error || res.statusText}`;
          return;
        }
        status.textContent = `入藏成功 · ${data.id} · md5 ${data.md5 || '—'}`;
        toast('入藏成功');
      } catch (err) {
        status.textContent = `网络失败：${err.message || err}`;
      }
    });

    $('#btn-import-paste')?.addEventListener('click', () => {
      try {
        const raw = $('#import-text').value.trim();
        if (!raw) { toast('粘贴区为空'); return; }
        importPayload(JSON.parse(raw));
      } catch (e) {
        toast(`导入失败：${e.message || e}`);
      }
    });
    $('#import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        importPayload(JSON.parse(text));
      } catch (err) {
        toast(`读文件失败：${err.message || err}`);
      }
      e.target.value = '';
    });
  }

  async function boot() {
    try {
      const res = await fetch('/assets/designer-schema.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`schema ${res.status}`);
      SCHEMA = await res.json();
    } catch (e) {
      document.querySelector('.designer-main').innerHTML =
        `<div class="error-state"><p class="empty-title">图谱未至</p><p class="empty-hint">未能加载 designer-schema.json（${e.message}）</p></div>`;
      return;
    }
    // seed a minimal example so first visit can export
    if (!state.content.weaponLooks.length) {
      state.content.weaponLooks.push({
        id: 'lookDemoPlain',
        label: '试笔直刃',
        baseShape: 'sword',
        parts: [
          { kind: 'palette', blade: '#e9eef7', trail: '#ff2040', edge: '#ff4a66', grip: '#3a2a18' },
          { kind: 'grip', length: 10, width: 3.2 },
          { kind: 'guard', style: 'cross', width: 11 },
          { kind: 'blade', profile: 'straight', lengthFrac: 1 },
          { kind: 'tip', style: 'point' },
          { kind: 'inkEdge' },
        ],
      });
    }
    // 首访：可导出的攻击盒（供 Behavior/外功 attackKey）+ Style + 兵刃 + 外功
    if (!state.content.attacks.length) {
      state.content.attacks.push({
        id: 'demo_cleave',
        name: 'demo_cleave',
        startup: 24,
        active: 5,
        recovery: 28,
        box: { x: 4, y: -96, w: 72, h: 90 },
        damage: 12,
        kbX: 5,
        kbY: -2,
        hitstun: 20,
        hitstop: 6,
        shake: 4,
        parryable: true,
        swing: 'slash',
      });
    }
    // 首访：可导出的攻击姿态（供 playPose.poseId；三帧 PoseNums，自 slash1 拷贝）
    // Loco3：同批样例 hp.idle（三帧同 lean；runtime locoPose 只读 strike）
    if (!state.content.poses.length) {
      const templates = (SCHEMA && SCHEMA.corePoseTemplates) || {};
      const base = templates.slash1 || {
        wind: { y: 4, lean: -0.08, head: 0, rot: 0, ft: 0.5, fk: -0.5, bt: -0.35, bk: -0.3, fa: 2.75, fe: 0.5, ba: -0.6, be: 0.6, w: 0.4 },
        strike: { y: 7, lean: 0.38, head: -0.1, rot: 0, ft: 0.8, fk: -0.75, bt: -0.6, bk: -0.2, fa: 1.0, fe: 0.15, ba: -1.0, be: 0.4, w: 0.15 },
        rec: { y: 6, lean: 0.32, head: 0, rot: 0, ft: 0.75, fk: -0.7, bt: -0.55, bk: -0.2, fa: 0.4, fe: 0.2, ba: -0.8, be: 0.5, w: 0.2 },
      };
      const clone = deepClone(base);
      state.content.poses.push({
        id: 'demo_slash_ink',
        wind: clone.wind,
        strike: clone.strike,
        rec: clone.rec,
      });
      // distinctive lean so smoke/apply can tell override from HP.idle
      const locoIdle = {
        y: 3, lean: 0.81, head: -0.08, rot: 0.17,
        ft: 0.42, fk: -0.5, bt: -0.32, bk: -0.3,
        fa: 0.5, fe: 1.0, ba: -0.3, be: 0.7, w: 0.55,
      };
      state.content.poses.push({
        id: 'hp.idle',
        wind: deepClone(locoIdle),
        strike: deepClone(locoIdle),
        rec: deepClone(locoIdle),
      });
    }
    // 首访：可导出的特效配方（供 inkBurst/fx.recipeId；emitter 闭集）
    if (!state.content.fxRecipes.length) {
      state.content.fxRecipes.push({
        id: 'demo_ink_flare',
        emitter: 'flare',
        color: '#c8a060',
        size: 56,
        life: 18,
      });
    }
    // R2 首访：可导出的投射物 + 弹幕（结构可被 applyContent 吃）
    if (!state.content.projectiles.length) {
      state.content.projectiles.push({
        id: 'demo_ink_arrow',
        drawKind: 'arrow',
        hitW: 32,
        hitH: 8,
        life: 240,
        hitSfx: 'arrow',
      });
    }
    if (!state.content.volleys.length) {
      state.content.volleys.push({
        id: 'demo_slow_thunder',
        style: 'thunder',
        defaultCount: 4,
        defaultInterval: 18,
        defaultSpread: 200,
        color: '#ffe080',
      });
    }
    // R2b/R4b 首访：图集别名 + synth/file 音效别名 + 幕氛围（结构可被 applyContent 吃）
    if (!state.content.sheets.length) {
      state.content.sheets.push({
        id: 'demo_blade_alias',
        src: './art/weapons/blade_ink.png',
        frameW: 64,
        frameH: 32,
        frames: 3,
        maxBytes: 512000,
      });
    }
    if (!state.content.sfx.length) {
      state.content.sfx.push({
        id: 'demo_ink_slash',
        synth: 'slash',
      });
      // R4b：示范 file sfx（仅路径；二进制须已在游戏静态 public/art/audio/，勿打进馆 tgz）
      state.content.sfx.push({
        id: 'demo_file_tap',
        src: './art/audio/r4a_smoke.wav',
        format: 'wav',
      });
    }
    if (!state.content.backdrops.length) {
      state.content.backdrops.push({
        id: 'demo_eclipse_tint',
        theme: 'eclipse',
        skyTint: '#1a1028',
        label: '试笔蚀月',
      });
    }
    // G2 首访：可导出的 Boss 招 + kit（结构可被 applyContent 吃）
    if (!state.content.bossMoves.length) {
      state.content.bossMoves.push({
        id: 'demo_slam_heavy',
        kind: 'slam',
        label: '重震',
        radius: 220,
        damage: 24,
        hitstop: 12,
      });
    }
    if (!state.content.bossKits.length) {
      state.content.bossKits.push({
        id: 'demo_yexun',
        close: [
          { move: 'claw', weight: 3 },
          { move: 'demo_slam_heavy', weight: 5 },
          { move: 'sweep', weight: 1.5 },
          { move: 'roar', weight: 1.4 },
        ],
        far: [
          { move: 'fireball', weight: 2 },
          { move: 'dive', weight: 2 },
          { move: 'demo_slam_heavy', weight: 3 },
          { move: 'inkNova', weight: 1.2 },
          { move: 'walk', weight: 1 },
        ],
      });
    }
    // D1 首访：可导出的精英词条 + 残页 + 称号（结构可被 applyContent 吃）
    if (!state.content.eliteMods.length) {
      state.content.eliteMods.push({
        id: 'demo_tongpi_lite',
        name: '试笔薄铜',
        color: '#c8a878',
        tag: '薄铜',
        dmgTakenMul: 0.78,
      });
    }
    if (!state.content.fragments.length) {
      state.content.fragments.push({
        id: 'demo_lieqi_lite',
        name: '试笔裂气',
        fogName: '残页·??',
        desc: '外功伤害略升',
        color: '#ff9080',
        tag: 'qi',
        skillDmgMul: 1.12,
      });
    }
    if (!state.content.titles.length) {
      state.content.titles.push({
        id: 'demo_wushang_lite',
        name: '试笔无伤',
        desc: '设计台试笔：整次出征未受伤',
        qol: '开局丹药 +1',
        startPotions: 1,
      });
    }
    // D2 首访：材料 + 套装 + 单件 + 兵器词缀（结构可被 applyContent 吃；套装先于单件语义）
    if (!state.content.materials.length) {
      state.content.materials.push({
        id: 'demo_yantie',
        name: '试笔夜铁',
        lore: '夜色中冷淬的碎铁，锻兵可试。',
        weight: 9,
        rare: true,
      });
    }
    if (!state.content.armorSets.length) {
      state.content.armorSets.push({
        id: 'demo_yexing_lite',
        fogName: '套装·夜??',
        name: '试笔夜行',
        lore: '踏影略轻，气机微灵。',
        slots: ['legs', 'arms', 'waist', 'neck'],
        weight: 12,
        two: { dashCdMul: 0.94, rage: 0.02 },
        full: { dashCdMul: 0.88, dashIframes: 2, rage: 0.04 },
        twoTip: '闪身冷却略缩短 · 气势微增',
        fullTip: '闪身更快 · 无敌略增 · 气势回复',
      });
    }
    if (!state.content.armorPieces.length) {
      state.content.armorPieces.push({
        id: 'demo_buyi_lite',
        name: '试笔布衣',
        slot: 'body',
        lore: '粗布短褐，聊胜于无。',
        base: { hp: 8, def: 1 },
        weight: 12,
        common: true,
        quality: 'fan',
        tier: 1,
      });
    }
    if (!state.content.wepAffixes.length) {
      state.content.wepAffixes.push({
        id: 'demo_poshi_lite',
        name: '试笔破势',
        fogName: '词缀·??',
        tip: '破韧 +12%',
        poiseMul: 1.12,
      });
    }
    // D3 首访：场地词缀（慢毒雾；结构可被 applyContent 吃；不接线导演）
    if (!state.content.affixes.length) {
      state.content.affixes.push({
        id: 'demo_mandu_lite',
        name: '试笔慢毒',
        fogName: '??·雾',
        desc: '毒雾更缓，蚀骨略轻',
        color: '#70c060',
        primaryWeight: 3,
        secondaryWeight: 1,
        dotPeriod: 120,
        dotDamage: 1,
        dotFloatEvery: 2,
        evolveTo: 'zhanghai',
        evolveAfter: 60 * 90,
        evolveBannerTitle: '词缀演化',
        evolveBannerSub: '慢毒 → 瘴海',
      });
    }
    // D4 首访：丹药 + 内功（effect / effects 嵌套；cost/meditateCost 吃 materials；可被 applyContent 吃）
    if (!state.content.pills.length) {
      state.content.pills.push({
        id: 'demo_huixue_lite',
        name: '试笔回血丹',
        lore: '温养气血，试笔一服。',
        tip: '出征：回复 40 生命',
        cost: { herb: 2, cinnabar: 1, silk: 1 },
        fee: 8,
        carryCap: 5,
        quality: 'fan',
        grade: 'xia',
        sortie: true,
        effect: {
          heal: 40,
          healWithFrag: true,
          floatText: '试笔回血',
          floatColor: '#ff6a7a',
          sfx: 'potion',
        },
      });
    }
    if (!state.content.neigong.length) {
      state.content.neigong.push({
        id: 'demo_hunyuan_lite',
        name: '试笔混元功',
        lore: '丹田混元，试笔心法。',
        tip: '武功伤害与气势均衡提升 · 内力回复平稳',
        signature: '回内：内力回复平稳 · 满级处决伤 +10%',
        style: '均衡',
        meditateCost: { cinnabar: 2, herb: 2 },
        fee: 22,
        quality: 'fan',
        effects: {
          damageBonus: [0.06, 0.09, 0.12, 0.16, 0.20],
          rageBonus: [0.08, 0.11, 0.14, 0.18, 0.22],
          defBonus: [0.02, 0.03, 0.04, 0.05, 0.06],
          neiliRegenMul: [1.0, 1.05, 1.1, 1.15, 1.2],
          executeMulBonus: 0.1,
        },
      });
    }
    // Act2 首访：可导出的幕池 + 幕间（嵌套 acts；结构可被 applyContent 吃；kit 可用本卷 demo_yexun）
    ensureActsShape();
    if (!state.content.acts.pools.length) {
      state.content.acts.pools.push({
        actIndex: 0,
        kit: 'demo_yexun',
        tint: 'jade',
        eliteWeights: { tongpi: 2, shanbu: 5, zhongji: 1, fanshang: 1, shixue: 1, xiehuo: 1 },
        dropLean: ['iron', 'bone', 'hide'],
        blueprintLean: ['silver', 'thorn'],
        setLean: ['tiegu', 'yingzhi'],
        loreLine: '设计台试笔·山门新钟。',
      });
    }
    if (!state.content.acts.beats.length) {
      state.content.acts.beats.push({
        fromAct: 0,
        id: 'betweenActs.demo.1to2',
        when: 'betweenActs',
        title: '试笔幕间',
        subtitle: '设计台试灌 betweenActs',
        holdFrames: 120,
        slowmo: 0.5,
      });
    }
    if (!state.content.combatStyles.length) {
      state.content.combatStyles.push({
        id: 'demo_chain',
        groundKeys: ['slash1', 'slash2', 'slash3', 'finisher'],
        branches: {
          dash: 'dashKick',
          groundUp: 'launcher',
          groundDown: 'sweep',
          airDown: 'plunge',
          airUp: 'rising',
          airNeutral: ['airA', 'airB'],
          throw: 'throw',
        },
        noChainOpen: ['finisher', 'throw', 'plunge'],
        plungeWaveKey: 'plungeWave',
      });
    }
    if (!state.content.weapons.length) {
      state.content.weapons.push({
        id: 'demo_canfeng',
        name: '试笔残锋',
        lore: '设计台默认示范刃，对照内容包 bingren / qiangying 字段。',
        tip: '刀剑 · 外观 lookDemoPlain · 链 demo_chain',
        unlock: { type: 'blueprint', hint: '设计台试笔' },
        damage: 0.96, speed: 1.04, reach: 1.02, poise: 0.95, rage: 1.0, airHover: 1.0,
        weight: 'medium', category: 'blade',
        affinities: ['juggle'], affinityBonus: 0.12,
        blade: '#e9eef7', trail: '#ff2040', edge: '#ff4a66', length: 56, shape: 'sword',
        quality: 'fan', tier: 1,
        lookId: 'lookDemoPlain',
        combatStyleId: 'demo_chain',
        feel: { boxTune: { tipXPush: 6, tipWFloorMul: 0.95 } },
        craft: { materials: { iron: 2, silk: 1 }, fee: 12 },
      });
    }
    if (!state.content.skills.length) {
      state.content.skills.push({
        id: 'demo_canmang',
        name: '试笔残锋诀',
        fogName: '武学·锋??',
        kind: 'active',
        track: 'combat',
        lore: '设计台默认外功：挂长夜既有攻击盒 daomang + 样子 slashInk + 轻量 castFx，不自造盒。',
        tip: '刀剑：试斩 · 耗内力',
        profHint: '持刀剑施放',
        meditateCost: {},
        fee: 0,
        quality: 'fan',
        weaponGate: 'blade',
        neiliCost: 28,
        castKind: 'attack',
        attackKey: 'daomang',
        castAnim: 'slashInk',
        castFx: [
          { kind: 'fx', preset: 'swordQi', heavy: true, color: '#7090c0' },
          { kind: 'fx', preset: 'flare', size: 48, color: '#a0b8e0' },
          { kind: 'hitstop', frames: 3 },
          { kind: 'shake', amp: 2, frames: 5 },
          { kind: 'sfx', id: 'slash' },
        ],
        commandSeq: ['D', 'F'],
        commandLabel: '↓→攻',
        hudHint: '试笔↓→J',
        touchPriority: 50,
      });
    }
    if (!state.content.animRecipes.length) {
      state.content.animRecipes.push({
        id: 'animDemoSlash',
        label: '试笔墨斩',
        steps: [
          { kind: 'playPose', poseId: 'slash1', frames: 5 },
          { kind: 'swingArc', radius: 72, sweep: 1.35, color: '#e8d0a0', frames: 8 },
          { kind: 'sfx', id: 'slash' },
        ],
      });
    }
    if (!state.content.talismanScripts.length) {
      state.content.talismanScripts.push({
        id: 'demo_cone',
        label: '试笔锥斩',
        anim: 'sealBurst',
        steps: [
          { kind: 'banner', text: '灵符', sub: '试笔锥斩', dur: 80 },
          { kind: 'flash', color: '#ffe0a0', a: 0.2 },
          { kind: 'sfx', id: 'slash' },
          { kind: 'damageCone', reach: 160, halfH: 50, damage: 16 },
          { kind: 'shake', amp: 3, frames: 6 },
        ],
      });
    }
    if (!state.content.talismans.length) {
      state.content.talismans.push({
        id: 'demo_fu',
        name: '试笔符',
        fogName: '灵符·试??',
        lore: '设计台默认示范符：挂本卷 demo_cone（含 damageCone + banner）。',
        tip: '出征：身前锥击试笔',
        color: '#c8a060',
        cost: { cinnabar: 1, silk: 1 },
        fee: 10,
        stockCap: 2,
        runCharges: 1,
        scriptId: 'demo_cone',
        anim: 'sealBurst',
        quality: 'fan',
        grade: 'xia',
      });
    }

    renderMeta();
    for (const s of Object.keys(LIST_KEYS)) {
      renderTray(s);
      renderRecipeEditor(s);
    }
    renderGameplay();
    renderStages();
    renderActs();
    wire();
    refreshExportPreview();
    showWorkbench(false);
    // warm-load act skeletons (non-blocking)
    fetch('/assets/stage-skeletons.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) STAGE_SKELS = j; })
      .catch(() => {});
  }

  boot();
})();
