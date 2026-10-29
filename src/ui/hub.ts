import type { Progression } from '../meta/progression';
import {
  MATERIALS, MATERIAL_BY_ID, SKILLS, SKILL_BY_ID, PILLS, PILL_BY_ID,
  WEAPONS, WEAPON_LEVEL_MAX, weaponUpgradeCost, CRAFT_RECIPES,
  IDENTIFY_FEE, QUALITY_NAME, SKILL_RANK_MAX,
  tipAtRank, profToNext,
  NEIGONGS, NEIGONG_BY_ID, NEIGONG_RANK_MAX, NEIGONG_RETRAIN_FEE, neigongTip, neigongMaxTip, neigongMeditateCost,
  EQUIP_SLOTS, SLOT_KIND_NAME, ARMOR_LEVEL_MAX, armorUpgradeCost,
  PILL_COLOR, PILL_SLOT_COUNT,
  skillUsableWith, gateLabel, CATEGORY_NAME, weaponCategory,
  TALISMANS, TALISMAN_BY_ID, TALISMAN_SLOT_COUNT,
  TITLES, TITLE_BY_ID, REFORGE_FEE, WEP_AFFIX_BY_ID,
  ARMOR_SETS, setDisplayName, QUALITY_COLOR, statRoll,
  gongfaRankName, GONGFA_RANK_MAX_LABEL, equipTierName,
} from '../meta/progression';
import type { Quality } from '../meta/progression';
import type { WeaponId, PillId, MaterialId, NeigongId, EquipSlotId, ArmorSlotKind, GearItem, TalismanId, TitleId } from '../meta/progression';
import { ELITE_MODS } from '../level/eliteMods';
import { AFFIXES } from '../level/affixes';
import { FRAGMENTS } from '../meta/runFragments';
import { wepAffixDisplay } from '../meta/weaponInstAffix';
import { talismanIconUrl } from '../render/artAssets';

export interface HubHandlers {
  /** boss = jump to boss of selected/unlocked act; act = 0-based chapter. */
  start: (boss?: boolean, act?: number) => void;
  title: () => void;
  refresh: () => void;
  click: () => void;
  /** 训练场 */
  training?: () => void;
}

/** Canonical hub tabs. */
type Tab = 'smith' | 'alchemy' | 'fu' | 'prep' | 'arts' | 'vault' | 'market' | 'wall' | 'codex' | 'dojo';

/** Combat sortie pills — derived from PillDef.sortie (plugins mark which may pack). */
function combatPillIds(): PillId[] {
  const marked = PILLS.filter((p) => p.sortie).map((p) => p.id);
  return marked.length ? marked : PILLS.map((p) => p.id);
}

const TABS: Tab[] = ['smith', 'alchemy', 'fu', 'prep', 'arts', 'vault', 'market', 'wall', 'codex', 'dojo'];

let currentTab: Tab = 'smith';

/** 铁匠铺内页：三选一入口 / 鉴定 / 铸造 / 强化（含重锻） */
type SmithView = 'menu' | 'identify' | 'forge' | 'enhance';
let smithView: SmithView = 'menu';

/** 备战当前部位筛选（跨 refresh 保留） */
let prepFilter: 'all' | 'weapon' | ArmorSlotKind = 'all';

/** 铸造：当前选中图纸（跨 refresh 保留） */
let forgeSelect: WeaponId | null = null;

/** 仓库选中材料 */
let vaultSelect: string | null = null;

/** 市集：兑出 / 购入 */
type MarketMode = 'out' | 'in';
let marketMode: MarketMode = 'out';
/** gear uid · mat:<id> · buy:<id> */
let marketSelect: string | null = null;

function isSmithView(raw: string | undefined | null): raw is SmithView {
  return raw === 'menu' || raw === 'identify' || raw === 'forge' || raw === 'enhance';
}

function isTab(raw: string): raw is Tab {
  return (TABS as string[]).includes(raw);
}

function resolveTab(raw: string | undefined | null): Tab {
  if (raw && isTab(raw)) return raw;
  return currentTab;
}

function matsLine(need: Partial<Record<MaterialId, number>>, have: Partial<Record<MaterialId, number>>): string {
  return Object.entries(need).map(([k, n]) => {
    const id = k as MaterialId;
    const h = have[id] ?? 0;
    const ok = h >= (n ?? 0);
    return `<span class="${ok ? 'mat-ok' : 'mat-no'}">${MATERIAL_BY_ID[id].name}×${n}${ok ? '' : `(${h})`}</span>`;
  }).join(' ');
}

function tabBar(active: Tab): string {
  const tabs: { id: Tab; name: string }[] = [
    { id: 'smith', name: '铁匠铺' },
    { id: 'alchemy', name: '丹房' },
    { id: 'fu', name: '符箓' },
    { id: 'prep', name: '备战' },
    { id: 'arts', name: '功法' },
    { id: 'vault', name: '仓库' },
    { id: 'market', name: '市集' },
    { id: 'wall', name: '战绩' },
    { id: 'codex', name: '图鉴' },
    { id: 'dojo', name: '训练场' },
  ];
  return `<div class="hub-tabs">${tabs.map((t) =>
    `<button data-tab="${t.id}" class="${t.id === active ? 'on' : ''}">${t.name}</button>`).join('')}</div>`;
}

function bonusLine(g: GearItem): string {
  const b = g.bonus;
  if (!b) return '';
  const parts: string[] = [];
  if (b.hp) parts.push(`气血+${b.hp}`);
  if (b.atk) parts.push(`攻势+${b.atk}`);
  if (b.def) parts.push(`护体+${b.def}`);
  if (b.rage) parts.push(`气势+${Math.round(b.rage * 100)}`);
  if (b.wugong) parts.push(`武功+${b.wugong}`);
  return parts.join(' · ') || '无附加';
}

function setLine(g: GearItem, prog: Progression): string {
  if (!g.setId) return '';
  const known = prog.knownArmorSet(g.setId);
  return ` · ${setDisplayName(g.setId, known)}`;
}

/** Quality label tinted by rarity colour. */
function qualTag(q: Quality | undefined): string {
  if (!q) return '';
  return `<b class="q-tag" style="color:${QUALITY_COLOR[q]}">${QUALITY_NAME[q]}</b>`;
}

/** 固有品质 · 阶位 · 淬炼 — EquipTier is 装备等级; level is forge. */
function gearGradeLine(g: { quality?: Quality; tier?: number; level?: number }, plain = false): string {
  const q = g.quality ?? 'fan';
  const tier = equipTierName(g.tier ?? 1);
  const forge = g.level ?? 1;
  if (plain) return `${QUALITY_NAME[q]} · ${tier} · 淬炼${forge}`;
  return `${qualTag(q)} · ${tier} · 淬炼${forge}`;
}

/** Per-copy forge roll line, e.g. 伤 104% · 破韧 97%. */
function rollLine(g: GearItem): string {
  if (g.kind !== 'weapon' || !g.identified) return '';
  const pct = (v: number | undefined) => {
    const n = Math.round(statRoll(v) * 100);
    const col = n > 100 ? '#8aab78' : n < 100 ? '#b88888' : '#a89890';
    const tone = n > 100 ? '上乘' : n < 100 ? '偏弱' : '平平';
    return `<span style="color:${col}">${n}（${tone}）</span>`;
  };
  return `<em class="wep-roll">伤势 ${pct(g.rollDmg)} · 破韧 ${pct(g.rollPoise)}</em>`;
}

/** Hub-visible blades — never list invisible 空手 fallback. */
function realWeapons(prog: Progression, filter?: WeaponId): GearItem[] {
  return prog.bagWeapons(filter);
}

/** 备战筛选：全部 · 兵刃 · 各防具部位（与娃娃槽位一致） */
type GearFilter = 'all' | 'weapon' | ArmorSlotKind;

/** 备战轮盘焦点：角色信息 / 部位 */
type PrepFocus = 'info' | GearFilter;
let prepFocus: PrepFocus = 'info';

function isPrepFocus(raw: string | undefined | null): raw is PrepFocus {
  return raw === 'info' || isGearFilter(raw);
}

const ARMOR_KIND_ORDER: ArmorSlotKind[] = ['head', 'body', 'arms', 'legs', 'neck', 'ring', 'waist'];

const GEAR_FILTERS: { id: GearFilter; name: string }[] = [
  { id: 'all', name: '全部' },
  { id: 'weapon', name: '兵刃' },
  ...ARMOR_KIND_ORDER.map((k) => ({ id: k as GearFilter, name: SLOT_KIND_NAME[k] })),
];

function isGearFilter(raw: string | undefined | null): raw is GearFilter {
  return !!raw && (raw === 'all' || raw === 'weapon' || raw in SLOT_KIND_NAME);
}

/** 类型小标题（装备分区内） */
function typeHead(name: string): string {
  return `<h4 class="hub-type">${name}</h4>`;
}

function skillCmd(id: string): string {
  return SKILL_BY_ID[id]?.commandLabel ?? '';
}

/** 铁匠铺子页顶栏：返回三选一 */
function smithBackBar(title: string): string {
  return `<div class="smith-sub-head">
    <button type="button" data-smith-view="menu" class="smith-back">← 回炉门</button>
    <h3 class="hub-sub smith-sub-title">${title}</h3>
  </div>`;
}

/** 铁匠铺三选一入口 */
function panelSmithMenu(prog: Progression): string {
  const unidN = prog.unidentified().length;
  const knownBp = WEAPONS.filter((w) => (prog.knowsBlueprint(w.id) || prog.owns(w.id))).length;
  const wepN = realWeapons(prog).length;
  const armorN = prog.data.gearBag.filter((g) => g.kind === 'armor' && g.identified).length;
  return `<div class="smith-menu" role="navigation" aria-label="铁匠铺">
    <button type="button" class="smith-entry" data-smith-view="identify">
      <b>辨物</b>
      <span>烛下辨认来历不明之物</span>
      <em>${unidN > 0 ? `待辨 ${unidN} 件` : '案上暂无待辨'} · 耗血晶</em>
    </button>
    <button type="button" class="smith-entry" data-smith-view="forge">
      <b>开炉</b>
      <span>依图纸反复锻打</span>
      <em>${knownBp > 0 ? `已得图纸 ${knownBp}` : '尚未得图纸'}</em>
    </button>
    <button type="button" class="smith-entry" data-smith-view="enhance">
      <b>淬炼</b>
      <span>加钢淬火 · 重锻词缀</span>
      <em>可淬之物 ${wepN + armorN}</em>
    </button>
  </div>`;
}

/** 鉴定专项：仅耗血晶 */
function panelSmithIdentify(prog: Progression): string {
  const d = prog.data;
  const list = prog.unidentified();
  const idfyCards = list.length ? list.map((g) => {
    const label = g.kind === 'weapon' ? '未鉴定兵刃' : '未鉴定防具';
    const canPay = d.crystals >= IDENTIFY_FEE;
    return `<div class="hub-card">
      <div class="hub-card-h"><b>？？？</b><span>${label}</span></div>
      <div class="wep-actions">
        <button data-idfy="${g.uid}" class="${canPay ? 'primary' : ''}" ${canPay ? '' : 'disabled'}>耗血晶 ${IDENTIFY_FEE}</button>
      </div>
    </div>`;
  }).join('') : '<div class="hub-empty">暂无未鉴定之物</div>';
  return `${smithBackBar('烛下辨物')}
    <p class="hub-section-tip">烛下辨认 · 每件耗血晶 ${IDENTIFY_FEE}</p>
    <div class="hub-grid">${idfyCards}</div>`;
}

/** 铸造专项：图谱式 — 左图纸列表 · 中炉台 · 右详略与材料 */
function panelSmithForge(prog: Progression): string {
  const d = prog.data;
  const known = WEAPONS.filter((w) => (prog.knowsBlueprint(w.id) || prog.owns(w.id)));
  if (!known.length) {
    return `${smithBackBar('炉中开打')}
      <div class="hub-empty">尚无图纸 · 夜行偶得或破关后方可开炉</div>`;
  }
  // Keep selection valid
  if (!forgeSelect || !known.some((w) => w.id === forgeSelect)) {
    forgeSelect = known[0].id;
  }
  const sel = known.find((w) => w.id === forgeSelect)!;
  const recipe = CRAFT_RECIPES[sel.id];
  const copies = realWeapons(prog, sel.id).length;
  const matEntries = recipe
    ? Object.entries(recipe.materials).map(([k, n]) => {
      const id = k as MaterialId;
      const need = n ?? 0;
      const have = d.materials[id] ?? 0;
      const ok = have >= need;
      const m = MATERIAL_BY_ID[id];
      return `<div class="forge-mat ${ok ? 'ok' : 'no'}" title="${m.lore}">
        <div class="forge-mat-ico" style="--mat:${id}">${m.name.slice(0, 1)}</div>
        <span class="forge-mat-name">${m.name}</span>
        <b class="${ok ? 'mat-ok' : 'mat-no'}">${have}/${need}</b>
      </div>`;
    }).join('')
    : '';
  const can = !!recipe
    && d.crystals >= recipe.fee
    && Object.entries(recipe.materials).every(([k, n]) => (d.materials[k as MaterialId] ?? 0) >= (n ?? 0));
  // 基础伤势区间（武侠口径，非技术倍率）
  const lo = Math.round(sel.damage * 90);
  const hi = Math.round(sel.damage * 110);
  const barPct = Math.min(100, Math.round(sel.damage * 55));

  const list = known.map((w) => {
    const on = w.id === forgeSelect;
    const n = realWeapons(prog, w.id).length;
    const fresh = prog.knowsBlueprint(w.id) && n === 0;
    return `<button type="button" class="forge-li ${on ? 'on' : ''}" data-forge-sel="${w.id}" style="--blade:${w.blade}">
      <i class="forge-li-sw" style="background:${w.blade};box-shadow:0 0 6px ${w.trail}"></i>
      <span>${w.name}</span>
      ${fresh ? '<em class="forge-new">新</em>' : (n > 0 ? `<em>×${n}</em>` : '')}
    </button>`;
  }).join('');

  return `${smithBackBar('炉中开打')}
    <div class="forge-layout">
      <aside class="forge-list" aria-label="已得图纸">${list}</aside>
      <div class="forge-stage" aria-hidden="true">
        <div class="forge-glow"></div>
        <div class="forge-anvil"></div>
        <div class="forge-smith"></div>
        <div class="forge-blade-glow" style="--blade:${sel.blade}"></div>
        <span class="forge-stage-label">安魂炉</span>
      </div>
      <aside class="forge-detail">
        <h3 class="forge-name" style="color:${sel.blade}">${sel.name}</h3>
        <p class="forge-lore">${sel.lore}</p>
        <div class="forge-preview" style="--blade:${sel.blade};--trail:${sel.trail}">
          <i class="forge-preview-blade"></i>
        </div>
        <div class="forge-stat">
          <div class="forge-stat-h"><span>基础伤势</span><b>${lo}~${hi}</b></div>
          <div class="forge-bar"><i style="width:${barPct}%"></i></div>
          <em class="card-meta">${sel.tip}</em>
        </div>
        <h4 class="hub-type">材料需求</h4>
        <div class="forge-mats">${matEntries || '<div class="hub-empty">无配方</div>'}</div>
        <div class="forge-act">
          <span class="forge-fee">血晶 <b>${recipe?.fee ?? '—'}</b></span>
          <button type="button" data-craft="${sel.id}" class="${can ? 'primary' : ''}" ${can ? '' : 'disabled'}>开炉锻打</button>
        </div>
        ${copies > 0 ? `<em class="card-meta">行囊已持此式 ${copies} 柄 · 可反复开炉</em>` : ''}
      </aside>
    </div>`;
}

/** 强化专项：淬炼 · 重锻；装备按类型分区 */
function panelSmithEnhance(prog: Progression): string {
  const d = prog.data;
  const eqUid = d.equippedWeaponUid;

  const weaponCards = realWeapons(prog).map((g) => {
    const w = WEAPONS.find((x) => x.id === g.weaponId)!;
    const lv = g.level ?? 1;
    const q = g.quality ?? 'fan';
    const equipped = g.uid === eqUid;
    const maxed = lv >= WEAPON_LEVEL_MAX;
    const cost = maxed ? 0 : weaponUpgradeCost(lv + 1);
    const canUp = !maxed && d.crystals >= cost;
    const reforgeLeftN = prog.reforgeLeft(g);
    return `<div class="hub-card weapon ${equipped ? 'equipped' : ''}" style="--blade:${w.blade}">
      <div class="hub-card-h">
        <b>${g.name ?? w.name}</b>
        <span>兵刃 · ${qualTag(q)} · ${equipTierName(g.tier ?? 1)} · 淬炼${lv}${maxed ? '（已满）' : ''}${equipped ? ' · 在手' : ''}</span>
      </div>
      ${rollLine(g)}
      <em class="card-meta">${g.wepAffix ? wepAffixDisplay(g.wepAffix, true) : '尚无词缀'}</em>
      <div class="wep-actions">
        <button data-up-w="${g.uid}" class="${canUp ? 'primary' : ''}" ${canUp ? '' : 'disabled'}>${maxed ? '已至极' : `淬炼 · 血晶 ${cost}`}</button>
        ${reforgeLeftN > 0
          ? `<button data-reforge="${g.uid}">重锻词缀 · 血晶 ${REFORGE_FEE}</button>`
          : '<button disabled>炉火已尽</button>'}
      </div>
    </div>`;
  });

  const armorByKind: Record<string, string[]> = Object.fromEntries(ARMOR_KIND_ORDER.map((k) => [k, []]));
  for (const g of d.gearBag.filter((x) => x.kind === 'armor' && x.identified)) {
    const kind = g.slot && g.slot in SLOT_KIND_NAME ? g.slot : 'body';
    const q = qualTag(g.quality);
    const slotName = g.slot ? SLOT_KIND_NAME[g.slot] : '?';
    const lv = g.level ?? 1;
    const maxed = lv >= ARMOR_LEVEL_MAX;
    const cost = maxed ? 0 : armorUpgradeCost(lv + 1);
    const canUp = !maxed && d.crystals >= cost;
    const worn = Object.values(d.equippedSlots).includes(g.uid);
    armorByKind[kind].push(`<div class="hub-card ${worn ? 'equipped' : ''}">
      <div class="hub-card-h"><b>${g.name ?? '防具'}</b><span>${slotName} · ${q} · ${equipTierName(g.tier ?? 1)} · 淬炼${lv}${worn ? ' · 在身' : ''}</span></div>
      <em class="card-meta">${bonusLine(g)}</em>
      <div class="wep-actions">
        <button data-up-armor="${g.uid}" class="${canUp ? 'primary' : ''}" ${canUp ? '' : 'disabled'}>${maxed ? '已至极' : `淬炼 · 血晶 ${cost}`}</button>
      </div>
    </div>`);
  }

  const blocks: string[] = [];
  if (weaponCards.length) {
    blocks.push(`${typeHead('兵刃')}<div class="hub-grid arsenal-grid">${weaponCards.join('')}</div>`);
  }
  for (const k of ARMOR_KIND_ORDER) {
    const cards = armorByKind[k];
    if (!cards.length) continue;
    blocks.push(`${typeHead(SLOT_KIND_NAME[k])}<div class="hub-grid">${cards.join('')}</div>`);
  }

  const body = blocks.join('') || '<div class="hub-empty">尚无已辨认的装备</div>';

  return `${smithBackBar('淬火加钢')}
    <p class="hub-section-tip">重锻仅限兵刃 · 换装请至备战 · 兑物请至市集</p>
    <h3 class="hub-sub">可淬之物</h3>
    ${body}`;
}


/** 铁匠铺：三选一入口 → 鉴定 / 铸造 / 强化（淬炼 · 重锻） */
function panelSmith(prog: Progression): string {
  switch (smithView) {
    case 'identify': return panelSmithIdentify(prog);
    case 'forge': return panelSmithForge(prog);
    case 'enhance': return panelSmithEnhance(prog);
    default: return panelSmithMenu(prog);
  }
}

/** 丹房：炼丹 + 库存；战斗丹可安静「装入」随身四袋（无出征专区） */
function panelAlchemy(prog: Progression): string {
  const d = prog.data;
  const slots = prog.ensurePillSlots();
  const combatSet = new Set<PillId>(combatPillIds());

  const cards = PILLS.map((p) => {
    const stock = prog.pillStock(p.id);
    const packed = slots.reduce((a, s) => a + (s && s.id === p.id ? s.n : 0), 0);
    const known = prog.knowsRecipe(p.id);
    if (!known && stock <= 0 && packed <= 0) return '';
    const canBrew = known && d.crystals >= p.fee && Object.entries(p.cost).every(([k, n]) => (d.materials[k as MaterialId] ?? 0) >= (n ?? 0));
    const stockLabel = packed > 0
      ? `存 ${stock} · 随身 ${packed}`
      : `存 ${stock}`;

    // Quiet pack: one 装入 into first free/same slot; 卸下 clears packed of this id
    let packActs = '';
    if (combatSet.has(p.id)) {
      const canPack = stock > 0 && packed < p.carryCap;
      let freeSi = -1;
      for (let i = 0; i < PILL_SLOT_COUNT; i++) {
        const s = slots[i];
        if (!s || s.id === p.id) { freeSi = i; break; }
      }
      if (canPack && freeSi >= 0) {
        packActs += `<button data-pack="${p.id}" data-slot="${freeSi}" class="quiet-act">装入</button>`;
      }
      if (packed > 0) {
        const clearSi = slots.findIndex((s) => s && s.id === p.id);
        if (clearSi >= 0) packActs += `<button data-clear-slot="${clearSi}" class="quiet-act">卸下</button>`;
      }
    }

    return `<div class="hub-card">
      <div class="hub-card-h"><b style="color:${PILL_COLOR[p.id]}">${p.name}</b><span>${stockLabel}</span></div>
      <em class="card-meta">${p.tip}</em>
      ${known ? `<em class="card-meta">${matsLine(p.cost, d.materials)} · 血晶 ${p.fee}</em>` : ''}
      <div class="wep-actions">
        ${known ? `<button data-brew="${p.id}" class="${canBrew ? 'primary' : ''}" ${canBrew ? '' : 'disabled'}>开炉炼制</button>` : ''}
        ${packActs}
      </div>
    </div>`;
  }).join('');

  return `<h3 class="hub-sub">丹药</h3>
    <p class="hub-section-tip">开炉炼制入库 · 需随身时点「装入」· 辨物请至铁匠铺耗血晶</p>
    <div class="hub-grid">${cards || '<div class="hub-empty">尚无丹药</div>'}</div>`;
}

/** 符箓：制符 + 库存；安静「装入」贴身双符（无双槽主界面） */
function panelFu(prog: Progression): string {
  const d = prog.data;
  const fuSlots = prog.ensureTalismanSlots();

  const fuCards = TALISMANS.map((t) => {
    const stock = prog.talismanStock(t.id);
    const known = prog.knowsTalisman(t.id);
    const packed = fuSlots.filter((s) => s && s.id === t.id).length;
    if (!known && stock <= 0 && packed <= 0) return '';
    const canCraft = known && d.crystals >= t.fee && Object.entries(t.cost).every(([k, n]) => (d.materials[k as MaterialId] ?? 0) >= (n ?? 0));
    const stockLabel = packed > 0
      ? `存 ${stock}/${t.stockCap} · 已贴 ${packed}`
      : `存 ${stock}/${t.stockCap}`;

    let packActs = '';
    const freeSi = fuSlots.findIndex((s) => !s);
    if (stock > 0 && freeSi >= 0) {
      packActs += `<button data-equip-fu="${t.id}" data-fu-slot="${freeSi}" class="quiet-act">装入</button>`;
    }
    const clearSi = fuSlots.findIndex((s) => s && s.id === t.id);
    if (clearSi >= 0) {
      packActs += `<button data-clear-fu="${clearSi}" class="quiet-act">揭下</button>`;
    }

    const ico = talismanIconUrl(t.id, 128);
    const nameHtml = ico
      ? `<span class="tal-name"><img class="tal-ico" src="${ico}" alt="" width="48" height="48" /><b style="color:${t.color}">${t.name}</b></span>`
      : `<b style="color:${t.color}">${t.name}</b>`;
    return `<div class="hub-card fu-card ${packed ? 'equipped' : ''}">
      <div class="hub-card-h${ico ? ' with-ico' : ''}">${nameHtml}<span>${stockLabel}</span></div>
      <em class="card-meta">${t.tip}</em>
      ${known ? `<em class="card-meta">${matsLine(t.cost, d.materials)} · 血晶 ${t.fee}</em>` : ''}
      <div class="wep-actions">
        ${known ? `<button data-craft-fu="${t.id}" class="${canCraft ? 'primary' : ''}" ${canCraft ? '' : 'disabled'}>研墨绘制</button>` : ''}
        ${packActs}
      </div>
    </div>`;
  }).join('');

  return `<h3 class="hub-sub">符咒</h3>
    <p class="hub-section-tip">研墨绘制入库 · 夜行需用时点「装入」贴身</p>
    <div class="hub-grid">${fuCards || '<div class="hub-empty">尚无符咒</div>'}</div>`;
}

/** 备战：环形装备轮 · 点槽出右栏详略 · 底栏战力摘要 */
function panelPrep(prog: Progression, filter: GearFilter = 'all'): string {
  const d = prog.data;
  const m = prog.mods();
  const eqWep = prog.equippedWeaponItem();
  const eqWDef = prog.equipped();
  const bare = prog.isBareHands();
  // eqWDef undefined when bare

  // Sync focus with legacy filter when filter changed from outside
  if (filter !== 'all' && prepFocus !== 'info' && prepFocus !== filter) {
    // keep prepFocus if explicitly set; else mirror filter
  }
  // When filter is specific and focus is info, prefer showing that bag filter in detail
  const focus: PrepFocus = prepFocus;

  type WheelSlot = { id: PrepFocus; label: string; angle: number; filled: boolean; tint?: string; short: string };
  const wepFilled = !bare && !!eqWep;
  const slots: WheelSlot[] = [
    { id: 'info', label: '角色', angle: 180, filled: true, short: '信' },
    { id: 'weapon', label: '兵刃', angle: 220, filled: wepFilled, tint: wepFilled && eqWDef ? eqWDef.blade : undefined, short: wepFilled ? (eqWep?.name ?? eqWDef?.name ?? '兵').slice(0, 1) : '兵' },
  ];
  const armorWheel: { kind: ArmorSlotKind; label: string; angle: number; slotIds: EquipSlotId[] }[] = [
    { kind: 'head', label: '冠帽', angle: 260, slotIds: ['head'] },
    { kind: 'body', label: '衣甲', angle: 300, slotIds: ['body'] },
    { kind: 'arms', label: '护腕', angle: 340, slotIds: ['arms'] },
    { kind: 'legs', label: '靴履', angle: 20, slotIds: ['legs'] },
    { kind: 'waist', label: '腰带', angle: 60, slotIds: ['waist'] },
    { kind: 'neck', label: '项链', angle: 100, slotIds: ['neck'] },
    { kind: 'ring', label: '戒指', angle: 140, slotIds: ['ring1', 'ring2'] },
  ];
  for (const a of armorWheel) {
    const worn = a.slotIds.map((sid) => prog.equippedIn(sid)).find(Boolean);
    slots.push({
      id: a.kind,
      label: a.label,
      angle: a.angle,
      filled: !!worn,
      short: worn ? (worn.name ?? a.label).slice(0, 1) : a.label.slice(0, 1),
    });
  }

  // Place slots on a ring using left/top % of .prep-wheel (NOT transform % —
  // translateY(%) is relative to the slot itself and piles everything at center).
  const WHEEL_R = 42; // percent of wheel box
  const wheelBtns = slots.map((s) => {
    const on = focus === s.id || (focus === 'all' && s.id === 'info');
    const cls = ['wheel-slot', s.filled ? 'filled' : 'empty', on ? 'on' : ''].filter(Boolean).join(' ');
    const rad = (s.angle * Math.PI) / 180;
    const left = 50 + WHEEL_R * Math.sin(rad);
    const top = 50 - WHEEL_R * Math.cos(rad);
    const style = `left:${left.toFixed(2)}%;top:${top.toFixed(2)}%${s.tint ? `;--blade:${s.tint}` : ''}`;
    return `<button type="button" class="${cls}" style="${style}" data-prep-focus="${s.id}" title="${s.label}">
      <span class="wheel-ico">${s.short}</span>
      <em class="wheel-lab">${s.label}</em>
    </button>`;
  }).join('');

  const focusLabel = focus === 'info' ? '角色' : focus === 'all' ? '全部' : focus === 'weapon' ? '兵刃' : SLOT_KIND_NAME[focus];

  // —— 右栏：角色信息 或 部位详略 + 行囊 ——
  let detail = '';
  if (focus === 'info' || focus === 'all') {
    const ng = m.equippedNeigong ? NEIGONG_BY_ID[m.equippedNeigong].name : '未修';
    const wepName = bare || !eqWDef ? '—' : eqWDef.name;
    detail = `<div class="prep-detail prep-info">
      <h3 class="forge-name">夜行人</h3>
      <em class="card-meta">心法 ${ng} · 兵刃 ${wepName}</em>
      <div class="attr-block">
        <h4 class="attr-h">气血</h4>
        <div class="attr-row"><span>气血上限</span><b>${m.maxHp}</b></div>
      </div>
      <div class="attr-block">
        <h4 class="attr-h">攻势</h4>
        <div class="attr-row"><span>攻势</span><b>${m.atk.toFixed(2)}</b></div>
        <div class="attr-row"><span>武功</span><b>+${Math.round(m.wugongBonus * 100)}</b></div>
      </div>
      <div class="attr-block">
        <h4 class="attr-h">护体</h4>
        <div class="attr-row"><span>护体</span><b>${Math.round(m.def * 100)}</b></div>
      </div>
      <div class="attr-block">
        <h4 class="attr-h">气势 · 内力</h4>
        <div class="attr-row"><span>气势</span><b>${m.rage.toFixed(2)}</b></div>
        <div class="attr-row"><span>内力上限</span><b>${m.maxNeili ?? '—'}</b></div>
      </div>
    </div>`;
  } else {
    // Equipped summary for this slot
    let wornHtml = '';
    if (focus === 'weapon') {
      if (bare || !eqWep) {
        wornHtml = `<div class="prep-worn empty"><b>兵刃空置</b><em>夜行仍可以拳脚应对</em></div>`;
      } else {
        wornHtml = `<div class="prep-worn" style="--blade:${eqWDef?.blade ?? '#c8b098'}">
          <h3 class="forge-name" style="color:${eqWDef?.blade ?? '#c8b098'}">${eqWep.name ?? eqWDef?.name ?? '兵刃'}</h3>
          <em class="card-meta">兵刃 · ${gearGradeLine(eqWep)}</em>
          ${rollLine(eqWep)}
          ${eqWep.wepAffix ? `<em class="card-meta">${wepAffixDisplay(eqWep.wepAffix, true)}</em>` : ''}
          <div class="wep-actions"><button data-unequip-wep>卸下</button></div>
        </div>`;
      }
    } else {
      const kinds = focus as ArmorSlotKind;
      const slotIds = EQUIP_SLOTS.filter((s) => s.kind === kinds);
      const pieces = slotIds.map((s) => ({ slot: s, g: prog.equippedIn(s.id) }));
      const any = pieces.some((p) => p.g);
      if (!any) {
        wornHtml = `<div class="prep-worn empty"><b>${SLOT_KIND_NAME[kinds]}空置</b><em>行囊择物穿上</em></div>`;
      } else {
        wornHtml = pieces.map(({ slot, g }) => {
          if (!g) return `<div class="prep-worn empty"><b>${slot.name} · 空</b></div>`;
          return `<div class="prep-worn">
            <h3 class="forge-name">${g.name ?? '防具'}</h3>
            <em class="card-meta">${SLOT_KIND_NAME[kinds]} · ${gearGradeLine({ quality: g.quality, tier: g.tier, level: g.level })}${setLine(g, prog)}</em>
            <em class="card-meta">${bonusLine(g)}</em>
            <div class="wep-actions"><button data-unequip-slot="${slot.id}">解下</button></div>
          </div>`;
        }).join('');
      }
    }

    // Bag for this filter
    const bagCards: string[] = [];
    if (focus === 'weapon') {
      const eqUid = d.equippedWeaponUid;
      for (const g of realWeapons(prog)) {
        const w = WEAPONS.find((x) => x.id === g.weaponId)!;
        const equipped = g.uid === eqUid;
        bagCards.push(`<div class="hub-card weapon ${equipped ? 'equipped' : ''}" style="--blade:${w.blade}">
          <div class="hub-card-h"><b>${g.name ?? w.name}</b><span>${gearGradeLine(g)}</span></div>
          <div class="wep-actions">
            <button data-eq-w-uid="${g.uid}" class="${equipped ? '' : 'primary'}" ${equipped ? 'disabled' : ''}>${equipped ? '已在手' : '入手'}</button>
          </div>
        </div>`);
      }
    } else {
      for (const g of prog.bagArmor(focus as ArmorSlotKind)) {
        bagCards.push(`<div class="hub-card">
          <div class="hub-card-h"><b>${g.name ?? '防具'}</b><span>${gearGradeLine(g)}${setLine(g, prog)}</span></div>
          <em class="card-meta">${bonusLine(g)}</em>
          <div class="wep-actions">
            <button data-equip-armor="${g.uid}" class="primary">穿上</button>
          </div>
        </div>`);
      }
    }

    detail = `<div class="prep-detail">
      <div class="prep-detail-label">${focusLabel}</div>
      ${wornHtml}
      <h4 class="hub-type">行囊</h4>
      <div class="prep-bag">${bagCards.join('') || '<div class="hub-empty">行囊暂无此物</div>'}</div>
    </div>`;
  }

  // Set echoes compact under wheel when viewing info
  const setProg = prog.armorSetProgress();
  const setLineHtml = focus === 'info' || focus === 'all'
    ? (() => {
      const bits = ARMOR_SETS.map((s) => {
        const n = setProg[s.id] ?? 0;
        const known = prog.knownArmorSet(s.id) || n >= 2;
        if (!known) return '';
        return `<span class="set-chip">${setDisplayName(s.id, true)} ${n}</span>`;
      }).filter(Boolean).join('');
      return bits ? `<div class="prep-sets">${bits}</div>` : '';
    })()
    : '';

  const power = m.maxHp + Math.round(m.atk * 100) + Math.round(m.def * 100) + Math.round(m.rage * 40);

  return `<div class="prep-layout">
    <div class="prep-stage">
      <div class="prep-wheel" role="group" aria-label="身着">
        <div class="prep-ring"></div>
        ${wheelBtns}
        <div class="char-figure prep-figure" aria-hidden="true">
          <div class="char-sil"></div>
          <span class="char-sil-label">夜行人</span>
        </div>
      </div>
      <div class="prep-summary">
        <div class="prep-power"><em>战力</em><b>${power}</b></div>
        <div class="prep-quick">
          <span title="气血"><i class="pq-ico hp"></i>${m.maxHp}</span>
          <span title="攻势"><i class="pq-ico atk"></i>${m.atk.toFixed(1)}</span>
          <span title="护体"><i class="pq-ico def"></i>${Math.round(m.def * 100)}</span>
          <span title="气势"><i class="pq-ico rage"></i>${m.rage.toFixed(1)}</span>
        </div>
      </div>
      ${setLineHtml}
    </div>
    ${detail}
  </div>`;
}


/** 功法：内功 + 武学；按当前兵器高亮 */
function panelArts(prog: Progression, opts: { confirmSwitch?: NeigongId } = {}): string {
  const m = prog.mods();
  const eqNg = prog.equippedNeigong();
  const eqName = eqNg ? NEIGONG_BY_ID[eqNg].name : '无';
  const eqW = prog.equipped();
  const cat = eqW ? weaponCategory(eqW.id) : 'bare';
  const wepLabel = prog.isBareHands() || !eqW ? '未持兵刃' : eqW.name;

  const knownNg = NEIGONGS.filter((n) => prog.knowsNeigong(n.id));
  const ngCards = knownNg.map((n) => {
    const rank = prog.neigongRank(n.id);
    const equipped = eqNg === n.id;
    const tip = neigongTip(n.id, rank);
    if (equipped) {
      const maxed = rank >= NEIGONG_RANK_MAX;
      const next = Math.min(NEIGONG_RANK_MAX, Math.max(1, rank + 1));
      const { mats, fee } = neigongMeditateCost(n.id, next);
      const can = !maxed && prog.data.crystals >= fee && Object.entries(mats).every(([k, v]) => (prog.data.materials[k as MaterialId] ?? 0) >= (v ?? 0));
      return `<div class="hub-card equipped">
        <div class="hub-card-h"><b>${n.name}</b><span>修至${gongfaRankName(rank)}</span></div>
        <em class="card-meta">${tip}</em>
        <em class="card-meta max-tip">${neigongMaxTip(n.id)}</em>
        ${maxed ? `<em class="card-meta">已至${GONGFA_RANK_MAX_LABEL}</em>` : `<em class="card-meta">${matsLine(mats, prog.data.materials)} · 血晶 ${fee}</em>`}
        <div class="wep-actions"><button data-ng-meditate="${n.id}" class="${can ? 'primary' : ''}" ${can ? '' : 'disabled'}>${maxed ? GONGFA_RANK_MAX_LABEL : '打坐'}</button></div>
      </div>`;
    }
    return `<div class="hub-card">
      <div class="hub-card-h"><b>${n.name}</b><span>${n.style}${rank > 0 ? ` · 曾修至${gongfaRankName(rank)}` : ''}</span></div>
      <em class="card-meta">${n.tip}</em>
      <em class="card-meta max-tip">${neigongMaxTip(n.id)}</em>
      <div class="wep-actions"><button data-ng-switch="${n.id}" class="primary">重修 · ${NEIGONG_RETRAIN_FEE}</button></div>
    </div>`;
  }).join('');

  const confirm = opts.confirmSwitch
    ? `<div class="hub-reset-confirm">
        <p>改修心法须耗血晶 ${NEIGONG_RETRAIN_FEE}：当前「${eqName}」修为将散尽；「${NEIGONG_BY_ID[opts.confirmSwitch].name}」从入门重练。夜行途中不可换心法。是否继续？</p>
        <em>${neigongMaxTip(opts.confirmSwitch)}</em>
        <button data-ng-switch-yes="${opts.confirmSwitch}" class="danger">确认重修 · 血晶 ${NEIGONG_RETRAIN_FEE}</button>
        <button data-ng-switch-no>取消</button>
      </div>`
    : '';

  const learnedSkills = SKILLS.filter((s) => prog.hasSkill(s.id));
  const combatCards = learnedSkills.map((s) => {
    const rank = prog.skillRank(s.id);
    const kindLabel = s.kind === 'active' ? '外功' : '被动';
    const tip = tipAtRank(s.id, rank);
    const cmd = skillCmd(s.id);
    const maxed = rank >= SKILL_RANK_MAX;
    const need = profToNext(rank);
    const prof = prog.skillProf(s.id);
    const pct = maxed ? 100 : Math.min(100, Math.floor((prof / Math.max(1, need)) * 100));
    const usable = skillUsableWith(s.id, cat);
    const gate = s.weaponGate;
    const gateTip = usable
      ? (gate && gate !== 'any' ? '当前兵器可用' : (s.kind === 'passive' || gate === 'any' ? '当前兵器可用' : '当前兵器可用'))
      : `需${gateLabel(gate)}`;
    const cls = usable ? 'usable' : 'gated';
    return `<div class="hub-card ${cls} ${s.kind === 'active' && usable ? 'equipped' : ''}">
      <div class="hub-card-h"><b>${s.name}</b><span>${kindLabel} · ${gongfaRankName(rank)}</span></div>
      <em class="card-meta">${tip}${cmd ? ` · ${cmd}` : ''}</em>
      <em class="gate-tip card-meta">${gateTip}</em>
      <div class="prof-bar"><i style="width:${pct}%"></i><span>${maxed ? `已至${GONGFA_RANK_MAX_LABEL}` : `熟练 ${prof}/${need}`}</span></div>
    </div>`;
  }).join('');

  const mastered = prog.learnedActives().map((id) => {
    const cmd = skillCmd(id);
    const gate = SKILL_BY_ID[id].weaponGate;
    const gname = gate && gate !== 'any' ? CATEGORY_NAME[gate as keyof typeof CATEGORY_NAME] ?? '' : '';
    const ok = skillUsableWith(id, cat);
    return `${ok ? '可用·' : ''}${SKILL_BY_ID[id].name}${cmd ? `（${cmd}）` : ''}${gname ? `·${gname}` : ''}`;
  }).join(' · ') || '暂无';

  const curseRow = prog.data.pendingCurseCleanse
    ? `<div class="hub-card"><div class="hub-card-h"><b>诅咒净秽</b><span>黑残页余秽</span></div>
        <p>上局诅咒交易残留。花费血晶 25 + 朱砂·灵草各 1 可净秽。</p>
        <button data-curse-cleanse class="danger">净秽</button></div>`
    : '';
  return `<h3 class="hub-sub">心法 · ${eqName}</h3>
    <p class="hub-section-tip">武功加成约 ${Math.round(m.wugongBonus * 100)} · 山门内可重修 · 夜行途中不可换</p>
    ${curseRow}
    ${confirm}
    <div class="hub-grid">${ngCards || '<div class="hub-empty">尚未得心法</div>'}</div>
    <h3 class="hub-sub">武学 · ${wepLabel}（${CATEGORY_NAME[cat]}）</h3>
    <p class="hub-section-tip muted-line">已掌握：${mastered}</p>
    <div class="hub-grid">${combatCards || '<div class="hub-empty">尚未得武学</div>'}</div>`;
}

/** 仓库：材料匣（未辨之物仅在铁匠铺辨物；兑物看市集） */
function panelVault(prog: Progression): string {
  const matList = MATERIALS.filter((m) => prog.mat(m.id) > 0);
  let cells = '';
  let detail = '<div class="vault-detail empty"><em>点选左侧一物</em></div>';

  if (!matList.length) {
    cells = '<div class="hub-empty">尚无材料</div>';
    detail = '<div class="vault-detail empty"><em>夜行拾得后汇于此匣</em></div>';
  } else {
    if (!vaultSelect || !matList.some((m) => m.id === vaultSelect)) {
      vaultSelect = matList[0].id;
    }
    cells = matList.map((m) => {
      const n = prog.mat(m.id);
      const on = vaultSelect === m.id;
      return `<button type="button" class="vault-cell ${on ? 'on' : ''}" data-vault-sel="${m.id}">
          <i class="vault-cell-ico mat">${m.name.slice(0, 1)}</i>
          <b>${m.name}</b>
          <em>${n}</em>
        </button>`;
    }).join('');
    const sel = matList.find((m) => m.id === vaultSelect)!;
    const n = prog.mat(sel.id);
    detail = `<div class="vault-detail">
        <h3 class="forge-name">${sel.name}</h3>
        <em class="card-meta">材料 · 持有 ${n}</em>
        <p class="forge-lore">${sel.lore}</p>
        <em class="card-meta">若欲兑成血晶，可赴市集</em>
      </div>`;
  }

  return `<p class="hub-section-tip">此处只收材料 · 未辨之物赴铁匠铺烛下辨认 · 已鉴装备看备战 · 兑物看市集</p>
    <div class="vault-layout">
      <div class="vault-grid">${cells}</div>
      ${detail}
    </div>`;
}

/** 市集：NPC 兑出已辨装备/材料 · 购入常用材料（不收未辨） */
function panelMarket(prog: Progression, confirmKey?: string): string {
  const d = prog.data;
  const modeRow = `<div class="vault-cats market-modes" role="tablist">
    <button type="button" role="tab" data-market-mode="out" class="vault-cat ${marketMode === 'out' ? 'on' : ''}">
      <i class="vault-cat-ico">出</i><span>兑出</span>
    </button>
    <button type="button" role="tab" data-market-mode="in" class="vault-cat ${marketMode === 'in' ? 'on' : ''}">
      <i class="vault-cat-ico">入</i><span>购入</span>
    </button>
  </div>`;

  let cells = '';
  let detail = '<div class="vault-detail empty"><em>点选左侧一物</em></div>';

  if (marketMode === 'out') {
    type Row = { key: string; glyph: string; title: string; sub: string; price: number; block?: string | null };
    const rows: Row[] = [];
    for (const g of realWeapons(prog)) {
      const block = prog.sellBlock(g);
      const w = WEAPONS.find((x) => x.id === g.weaponId);
      rows.push({
        key: `g:${g.uid}`,
        glyph: (g.name ?? w?.name ?? '兵').slice(0, 1),
        title: g.name ?? w?.name ?? '兵刃',
        sub: `兵刃 · ${gearGradeLine(g, true)}`,
        price: prog.sellPrice(g),
        block,
      });
    }
    for (const g of d.gearBag.filter((x) => x.kind === 'armor' && x.identified)) {
      const block = prog.sellBlock(g);
      const slot = g.slot ? SLOT_KIND_NAME[g.slot] : '防具';
      rows.push({
        key: `g:${g.uid}`,
        glyph: (g.name ?? slot).slice(0, 1),
        title: g.name ?? '防具',
        sub: `${slot} · ${gearGradeLine(g, true)}`,
        price: prog.sellPrice(g),
        block,
      });
    }
    for (const m of MATERIALS) {
      const n = prog.mat(m.id);
      if (n <= 0) continue;
      rows.push({
        key: `m:${m.id}`,
        glyph: m.name.slice(0, 1),
        title: m.name,
        sub: `材料 · 持有 ${n}`,
        price: prog.matSellPrice(m.id, 1),
        block: null,
      });
    }

    if (!rows.length) {
      cells = '<div class="hub-empty">行囊暂无可兑之物</div>';
      detail = '<div class="vault-detail empty"><em>已辨装备与材料方可交付市集 · 未辨请先辨物</em></div>';
    } else {
      if (!marketSelect || !rows.some((r) => r.key === marketSelect)) {
        marketSelect = rows[0].key;
      }
      cells = rows.map((r) => {
        const on = marketSelect === r.key;
        const dim = r.block ? ' fog' : '';
        return `<button type="button" class="vault-cell${dim} ${on ? 'on' : ''}" data-market-sel="${r.key}">
          <i class="vault-cell-ico">${r.glyph}</i>
          <b>${r.title}</b>
          <em>血晶 ${r.price}</em>
        </button>`;
      }).join('');
      const sel = rows.find((r) => r.key === marketSelect)!;
      if (sel.key.startsWith('g:')) {
        const uid = sel.key.slice(2);
        const g = prog.gearByUid(uid)!;
        const conf = confirmKey === sel.key;
        let acts = '';
        if (sel.block) {
          acts = `<button disabled title="${sel.block}">不可兑出</button>`;
        } else if (conf) {
          acts = `<div class="hub-reset-confirm sell-confirm">
            <p>确认兑出「${sel.title}」？交付后无法赎回。</p>
            <button data-market-out-yes="${sel.key}" class="danger">确认兑出 · 血晶 ${sel.price}</button>
            <button data-market-out-no>取消</button>
          </div>`;
        } else {
          acts = `<button data-market-out="${sel.key}" class="primary">兑出 · 血晶 ${sel.price}</button>`;
        }
        detail = `<div class="vault-detail">
          <h3 class="forge-name">${sel.title}</h3>
          <em class="card-meta">${sel.sub}</em>
          ${g.kind === 'armor' ? `<em class="card-meta">${bonusLine(g)}</em>` : ''}
          ${g.kind === 'weapon' ? rollLine(g) : ''}
          <div class="wep-actions">${acts}</div>
        </div>`;
      } else {
        const mid = sel.key.slice(2) as MaterialId;
        const m = MATERIAL_BY_ID[mid];
        const n = prog.mat(mid);
        const conf = confirmKey === sel.key;
        const p1 = prog.matSellPrice(mid, 1);
        const p5 = prog.matSellPrice(mid, Math.min(5, n));
        let acts = '';
        if (conf) {
          acts = `<div class="hub-reset-confirm sell-confirm">
            <p>确认兑出「${m.name}」×1？</p>
            <button data-market-out-yes="${sel.key}" class="danger">确认兑出 · 血晶 ${p1}</button>
            <button data-market-out-no>取消</button>
          </div>`;
        } else {
          acts = `<button data-market-out="${sel.key}" class="primary">兑出×1 · 血晶 ${p1}</button>`;
          if (n >= 5) acts += `<button data-market-out5="${sel.key}">兑出×5 · 血晶 ${p5}</button>`;
        }
        detail = `<div class="vault-detail">
          <h3 class="forge-name">${m.name}</h3>
          <em class="card-meta">材料 · 持有 ${n} · 单价血晶 ${p1}</em>
          <p class="forge-lore">${m.lore}</p>
          <div class="wep-actions">${acts}</div>
        </div>`;
      }
    }
  } else {
    // 购入 — NPC 常备材料
    const stock = MATERIALS;
    if (!marketSelect || !stock.some((m) => `b:${m.id}` === marketSelect)) {
      marketSelect = `b:${stock[0].id}`;
    }
    cells = stock.map((m) => {
      const key = `b:${m.id}`;
      const on = marketSelect === key;
      const price = prog.matBuyPrice(m.id, 1);
      return `<button type="button" class="vault-cell ${on ? 'on' : ''}" data-market-sel="${key}">
        <i class="vault-cell-ico mat">${m.name.slice(0, 1)}</i>
        <b>${m.name}</b>
        <em>血晶 ${price}</em>
      </button>`;
    }).join('');
    const mid = (marketSelect!.slice(2)) as MaterialId;
    const m = MATERIAL_BY_ID[mid];
    const unit = prog.matBuyPrice(mid, 1);
    const can1 = d.crystals >= unit;
    const can5 = d.crystals >= prog.matBuyPrice(mid, 5);
    detail = `<div class="vault-detail">
      <h3 class="forge-name">${m.name}</h3>
      <em class="card-meta">市集常备 · 单价血晶 ${unit} · 持有 ${prog.mat(mid)}</em>
      <p class="forge-lore">${m.lore}</p>
      <div class="wep-actions">
        <button data-market-buy="${mid}" data-n="1" class="${can1 ? 'primary' : ''}" ${can1 ? '' : 'disabled'}>购入×1</button>
        <button data-market-buy="${mid}" data-n="5" class="${can5 ? 'primary' : ''}" ${can5 ? '' : 'disabled'}>购入×5 · 血晶 ${prog.matBuyPrice(mid, 5)}</button>
      </div>
    </div>`;
  }

  return `<p class="hub-section-tip">市集收已辨装备与材料兑血晶 · 亦可购入常用材料 · 未辨之物请先赴铁匠铺辨认</p>
    ${modeRow}
    <div class="vault-layout market-layout">
      <div class="vault-grid">${cells}</div>
      ${detail}
    </div>`;
}


function panelWall(prog: Progression): string {
  const unlocked = new Set(prog.data.unlockedTitles ?? []);
  const cards = TITLES.filter((t) => unlocked.has(t.id)).map((t) => {
    return `<div class="hub-card equipped">
      <div class="hub-card-h"><b>${t.name}</b><span>已铭</span></div>
      <p>${t.desc}</p>
      <em>小惠：${t.qol}</em>
    </div>`;
  }).join('') || '<div class="hub-empty">尚无铭刻</div>';
  return `<p class="hub-section-tip">夜行所留铭刻 · 微弱常驻便利</p>
    <div class="hub-grid">${cards}</div>`;
}

function panelCodex(prog: Progression): string {
  const c = prog.ensureCodex();
  const elites = ELITE_MODS.filter((m) => c.elites.includes(m.id)).map((m) => {
    return `<div class="hub-card"><div class="hub-card-h"><b>${m.name}</b></div></div>`;
  }).join('') || '<div class="hub-empty muted">尚未见识</div>';
  const aff = AFFIXES.filter((a) => c.affixes.includes(a.id)).map((a) => {
    return `<div class="hub-card"><div class="hub-card-h"><b>${a.name}</b></div><p>${a.desc}</p></div>`;
  }).join('') || '<div class="hub-empty muted">尚未见识</div>';
  const fr = FRAGMENTS.filter((f) => c.fragments.includes(f.id)).map((f) => {
    return `<div class="hub-card"><div class="hub-card-h"><b>${f.name}</b></div></div>`;
  }).join('') || '<div class="hub-empty muted">尚未拾得</div>';
  const fu = TALISMANS.filter((x) => c.talismans.includes(x.id) || prog.knowsTalisman(x.id)).map((x) => {
    const ico = talismanIconUrl(x.id, 64);
    const head = ico
      ? `<span class="tal-name"><img class="tal-ico" src="${ico}" alt="" width="32" height="32" /><b>${x.name}</b></span>`
      : `<b>${x.name}</b>`;
    return `<div class="hub-card fu-card"><div class="hub-card-h${ico ? ' with-ico' : ''}">${head}</div></div>`;
  }).join('') || '<div class="hub-empty muted">尚未绘符</div>';
  return `<h3 class="hub-sub">所见精英</h3><div class="hub-grid mat-grid">${elites}</div>
    <h3 class="hub-sub">所历异象</h3><div class="hub-grid mat-grid">${aff}</div>
    <h3 class="hub-sub">心法残页</h3><div class="hub-grid mat-grid">${fr}</div>
    <h3 class="hub-sub">所知灵符</h3><div class="hub-grid mat-grid">${fu}</div>`;
}

function panelDojo(prog: Progression): string {
  const n = prog.data.dojoVisits ?? 0;
  return `<div class="hub-card equipped dojo-card">
      <div class="hub-card-h"><b>演武坪</b><span>已练 ${n} 回</span></div>
      <em class="card-meta">木人桩上练格挡、处决与兵器克制 · 不计入夜行</em>
      <div class="wep-actions">
        <button data-act="dojo" class="primary">上坪演武</button>
        <button data-touch-layout="compact">指法·近</button>
        <button data-touch-layout="wide">指法·疏</button>
      </div>
    </div>`;
}

function renderPanel(tab: Tab, prog: Progression, opts: { confirmSwitch?: NeigongId; equipFilter?: GearFilter; confirmMarket?: string } = {}): string {
  switch (tab) {
    case 'smith': return panelSmith(prog);
    case 'alchemy': return panelAlchemy(prog);
    case 'fu': return panelFu(prog);
    case 'prep': return panelPrep(prog, opts.equipFilter ?? prepFilter);
    case 'arts': return panelArts(prog, opts);
    case 'vault': return panelVault(prog);
    case 'market': return panelMarket(prog, opts.confirmMarket);
    case 'wall': return panelWall(prog);
    case 'codex': return panelCodex(prog);
    case 'dojo': return panelDojo(prog);
  }
}

/** 山门养成 hub — 铁匠铺 / 丹房 / 符箓 / 备战 / 功法 / 仓库 / 市集 / 战绩 / 图鉴 / 训练场. */
export function renderHub(root: HTMLElement, prog: Progression, h: HubHandlers, opts: { confirmReset?: boolean; tab?: string; confirmSwitch?: NeigongId; equipFilter?: GearFilter; confirmMarket?: string } = {}): void {
  if (opts.tab) currentTab = resolveTab(opts.tab);
  else currentTab = resolveTab(currentTab);
  if (opts.equipFilter && isGearFilter(opts.equipFilter)) {
    prepFilter = opts.equipFilter;
    prepFocus = opts.equipFilter === 'all' ? 'info' : opts.equipFilter;
  }
  const d = prog.data;
  const m = prog.mods();
  const eq = prog.equipped();
  const matN = Object.values(d.materials).reduce<number>((a, b) => a + (b ?? 0), 0);
  const unlocked = prog.unlockedAct();
  const cleared = new Set(prog.clearedActs());
  const ACT_NAMES = ['一幕 · 夜雨', '二幕 · 客栈', '三幕 · 荒冢', '四幕 · 月蚀'];
  const actBar = `<div class="hub-acts">${ACT_NAMES.map((name, i) => {
    const open = i <= unlocked;
    const done = cleared.has(i);
    return `<button data-start-act="${i}" class="${open ? (i === unlocked ? 'primary' : '') : ''}" ${open ? '' : 'disabled'} title="${open ? name : '山门未启'}">${done ? '破·' : ''}${name}${open ? '' : ' · 未启'}</button>`;
  }).join('')}</div>`;

  const resetBlock = opts.confirmReset
    ? `<div class="hub-reset-confirm">
        <p>确认抹去山门全部养成？此举不可挽回。</p>
        <button data-act="reset-yes" class="danger">确认抹去</button>
        <button data-act="reset-no">作罢</button>
      </div>`
    : `<button data-act="reset" class="ghost danger-text">抹去进度</button>`;

  // Keep scroll position across same-tab re-renders (forge/sell/enhance, etc.).
  // Also snapshot window/visualViewport in case iOS Safari bounced the page shell.
  const sameTab = root.dataset.hubTab === currentTab;
  const keep: Array<[string, number, number]> = [];
  const keepWin = sameTab ? { x: window.scrollX, y: window.scrollY } : null;
  if (sameTab) {
    for (const sel of ['.hub-tab-body', '.hub-tabs', '.hub-acts', '.hub-panel']) {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) keep.push([sel, el.scrollTop, el.scrollLeft]);
    }
  }
  // Drop lingering focus so iOS/WebKit won't scrollIntoView the old control after DOM swap.
  const ae = document.activeElement;
  if (ae instanceof HTMLElement && root.contains(ae)) ae.blur();
  root.dataset.hubTab = currentTab;
  root.className = 'screen screen-hub';
  root.innerHTML = `
    <div class="panel hub-panel">
      <div class="hub-ornament-corners" aria-hidden="true">
        <i class="oc tl"></i><i class="oc tr"></i><i class="oc bl"></i><i class="oc br"></i>
      </div>
      <div class="hub-chrome">
        <div class="hub-head">
          <h2 class="hub-title">长夜山门</h2>
          <div class="hub-res">
            <div class="pill crystal">血晶 <b>${d.crystals}</b></div>
            <div class="pill">材料 <b>${matN}</b></div>
            <div class="pill">武功 <b>+${Math.round(m.wugongBonus * 100)}</b></div>
          </div>
        </div>
        <div class="hub-stats">
          <div><em>气血</em><b>${m.maxHp}</b></div>
          <div><em>攻势</em><b>${m.atk.toFixed(2)}</b></div>
          <div><em>护体</em><b>${Math.round(m.def * 100)}</b></div>
          <div><em>气势</em><b>${m.rage.toFixed(2)}</b></div>
          <div><em>心法</em><b>${m.equippedNeigong ? NEIGONG_BY_ID[m.equippedNeigong].name : '未修'}</b></div>
          <div><em>兵刃</em><b>${prog.isBareHands() || !eq ? '—' : eq.name}</b></div>
        </div>
        ${d.legacyPending ? `<div class="hub-reset-confirm"><p>折戟遗产：稳行（满血满内）或险途（敌势略强）。</p>
          <button data-legacy="boon" class="primary">稳行</button>
          <button data-legacy="risk" class="danger">险途</button>
        </div>` : ''}
        ${tabBar(currentTab)}
      </div>
      <div class="hub-tab-body">${renderPanel(currentTab, prog, { confirmSwitch: opts.confirmSwitch, equipFilter: opts.equipFilter, confirmMarket: opts.confirmMarket })}</div>
      <div class="hub-bottom">
        ${actBar}
        <div class="hub-actions">
          <button data-act="start" class="primary big">拔剑夜行</button>
          <button data-act="boss">直闯镇山</button>
          <button data-act="title">归至月下</button>
          ${resetBlock}
        </div>
        <p class="hub-foot">夜行 ${d.runs} 回 · 破关 ${d.clears} · 正值第 ${unlocked + 1} 幕</p>
      </div>
    </div>`;
  root.querySelectorAll('button').forEach((b) => {
    if (!b.getAttribute('type')) b.setAttribute('type', 'button');
  });
  const restoreScroll = () => {
    for (const [sel, top, left] of keep) {
      const el = root.querySelector<HTMLElement>(sel);
      if (el) { el.scrollTop = top; el.scrollLeft = left; }
    }
    if (keepWin && (window.scrollX !== keepWin.x || window.scrollY !== keepWin.y)) {
      window.scrollTo(keepWin.x, keepWin.y);
    }
  };
  restoreScroll();
  // Layout / iOS momentum scroll can clobber sync restore; re-apply next frames.
  if (keep.length || keepWin) {
    requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    });
  }

  root.onclick = (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-act],[data-tab],[data-smith-view],[data-craft],[data-forge-sel],[data-eq-w],[data-eq-w-uid],[data-up-w],[data-up-armor],[data-idfy],[data-unequip-wep],[data-ng-meditate],[data-ng-switch],[data-ng-switch-yes],[data-ng-switch-no],[data-brew],[data-pack],[data-clear-slot],[data-equip-armor],[data-unequip-slot],[data-unequip-uid],[data-equip-filter],[data-filter-slot],[data-prep-focus],[data-vault-sel],[data-market-mode],[data-market-sel],[data-market-out],[data-market-out5],[data-market-out-yes],[data-market-out-no],[data-market-buy],[data-start-act],[data-craft-fu],[data-equip-fu],[data-clear-fu],[data-fu-slot],[data-reforge],[data-legacy],[data-touch-layout],[data-curse-cleanse]',
    );
    if (!el) return;
    e.preventDefault();
    h.click();
    if (el.dataset.tab) {
      const next = resolveTab(el.dataset.tab);
      if (next === 'smith') {
        // Explicit deep-link (去鉴定/强化) wins; bare 铁匠铺 tab always lands on 三选一.
        smithView = isSmithView(el.dataset.smithView) ? el.dataset.smithView : 'menu';
      }
      currentTab = next;
      h.refresh();
      return;
    }
    if (el.dataset.smithView) {
      if (!isSmithView(el.dataset.smithView)) return;
      smithView = el.dataset.smithView;
      // Entering a sub-page / returning to menu: reset body scroll.
      const body = root.querySelector<HTMLElement>('.hub-tab-body');
      if (body) body.scrollTop = 0;
      h.refresh();
      return;
    }
    if (el.dataset.forgeSel) {
      forgeSelect = el.dataset.forgeSel as WeaponId;
      h.refresh();
      return;
    }
    if (el.dataset.prepFocus !== undefined) {
      const f = isPrepFocus(el.dataset.prepFocus) ? el.dataset.prepFocus : 'info';
      prepFocus = f;
      if (f !== 'info' && isGearFilter(f)) prepFilter = f;
      h.refresh();
      return;
    }
    if (el.dataset.vaultSel) {
      vaultSelect = el.dataset.vaultSel;
      h.refresh();
      return;
    }
    if (el.dataset.marketMode) {
      marketMode = el.dataset.marketMode === 'in' ? 'in' : 'out';
      marketSelect = null;
      h.refresh();
      return;
    }
    if (el.dataset.marketSel) {
      marketSelect = el.dataset.marketSel;
      h.refresh();
      return;
    }
    const showToast = (msg: string) => {
      const tip = root.querySelector('.hub-toast');
      if (tip) tip.remove();
      const dEl = document.createElement('div');
      dEl.className = 'hub-toast';
      dEl.textContent = msg;
      root.querySelector('.hub-panel')?.appendChild(dEl);
      setTimeout(() => dEl.remove(), 1800);
    };
    const toast = (msg: string | true, okMsg?: string) => {
      if (msg === true) {
        h.refresh();
        if (okMsg) showToast(okMsg);
        return;
      }
      showToast(msg);
    };
    if (el.dataset.craft) {
      const r = prog.craftWeapon(el.dataset.craft as WeaponId);
      let okMsg: string | undefined;
      if (r === true) {
        const g = prog.lastCrafted;
        okMsg = g
          ? `炉中成${QUALITY_NAME[g.quality ?? 'fan']}品「${g.name ?? '兵刃'}」· 伤势 ${Math.round(statRoll(g.rollDmg) * 100)} · 破韧 ${Math.round(statRoll(g.rollPoise) * 100)}`
          : '已锻成新兵刃 · 可至备战入手或铁匠铺淬炼';
      }
      return toast(r, okMsg);
    }
    const doMarketOut = (key: string, n = 1) => {
      if (key.startsWith('g:')) {
        const uid = key.slice(2);
        const g = prog.gearByUid(uid);
        const name = g?.name ?? '此物';
        const r = prog.sellGear(uid);
        if (typeof r === 'number') {
          marketSelect = null;
          h.refresh();
          showToast(`已兑出「${name}」· 血晶 +${r}`);
        } else {
          showToast(r);
        }
        return;
      }
      if (key.startsWith('m:')) {
        const mid = key.slice(2) as MaterialId;
        const name = MATERIAL_BY_ID[mid]?.name ?? '材料';
        const r = prog.sellMaterial(mid, n);
        if (typeof r === 'number') {
          if (prog.mat(mid) <= 0) marketSelect = null;
          h.refresh();
          showToast(`已兑出「${name}」×${n} · 血晶 +${r}`);
        } else {
          showToast(r);
        }
      }
    };
    if (el.dataset.marketOut) {
      const key = el.dataset.marketOut;
      if (key.startsWith('g:')) {
        const g = prog.gearByUid(key.slice(2));
        if (!g) return;
        const block = prog.sellBlock(g);
        if (block) return showToast(block);
        if (prog.sellNeedsConfirm(g)) {
          renderHub(root, prog, h, { tab: 'market', confirmMarket: key });
          return;
        }
        return doMarketOut(key);
      }
      return doMarketOut(key, 1);
    }
    if (el.dataset.marketOut5) return doMarketOut(el.dataset.marketOut5, 5);
    if (el.dataset.marketOutYes) return doMarketOut(el.dataset.marketOutYes, 1);
    if (el.dataset.marketOutNo !== undefined) { h.refresh(); return; }
    if (el.dataset.marketBuy) {
      const mid = el.dataset.marketBuy as MaterialId;
      const n = Math.max(1, Number(el.dataset.n ?? 1) || 1);
      const name = MATERIAL_BY_ID[mid]?.name ?? '材料';
      const r = prog.buyMaterial(mid, n);
      return toast(r, `已购入「${name}」×${n}`);
    }
    if (el.dataset.eqWUid) {
      if (prog.equipWeaponUid(el.dataset.eqWUid)) h.refresh();
      return;
    }
    if (el.dataset.eqW) { if (prog.equipWeapon(el.dataset.eqW as WeaponId)) h.refresh(); return; }
    if (el.dataset.upW) return toast(prog.upgradeWeapon(el.dataset.upW));
    if (el.dataset.reforge) {
      const uid = el.dataset.reforge;
      const r = prog.reforgeWeapon(uid);
      const g = prog.gearByUid(uid);
      const left = g ? prog.reforgeLeft(g) : 0;
      return toast(r, left > 0 ? '词缀已重锻 · 炉火未尽' : '词缀已重锻 · 此刃炉火已尽');
    }
    if (el.dataset.legacy) {
      prog.pickLegacy(el.dataset.legacy as 'boon' | 'risk');
      showToast(el.dataset.legacy === 'boon' ? '已选稳行' : '已选险途');
      h.refresh();
      return;
    }
    if (el.dataset.touchLayout) {
      localStorage.setItem('requiem-touch-layout', el.dataset.touchLayout);
      showToast(el.dataset.touchLayout === 'wide' ? '指法已疏' : '指法已近');
      return;
    }
    if (el.dataset.upArmor) return toast(prog.upgradeArmor(el.dataset.upArmor));
    if (el.dataset.idfy) {
      const r = prog.identify(el.dataset.idfy);
      return toast(r, r === true ? '已辨明 · 可至备战穿戴' : undefined);
    }
    if (el.hasAttribute('data-unequip-wep')) {
      if (prog.unequipWeapon()) h.refresh();
      return;
    }
    if (el.dataset.ngMeditate) return toast(prog.meditateNeigong(el.dataset.ngMeditate as NeigongId));
    if (el.dataset.ngSwitch) {
      renderHub(root, prog, h, { tab: 'arts', confirmSwitch: el.dataset.ngSwitch as NeigongId });
      return;
    }
    if (el.dataset.ngSwitchYes) return toast(prog.switchNeigong(el.dataset.ngSwitchYes as NeigongId));
    if (el.hasAttribute('data-curse-cleanse')) return toast(prog.cleanseCurse());
    if (el.dataset.ngSwitchNo !== undefined) { h.refresh(); return; }
    if (el.dataset.brew) return toast(prog.brew(el.dataset.brew as PillId));
    if (el.dataset.craftFu) return toast(prog.craftTalisman(el.dataset.craftFu as TalismanId), '灵符已成');
    if (el.dataset.equipFu) {
      const si = el.dataset.fuSlot !== undefined ? Number(el.dataset.fuSlot) : 0;
      return toast(prog.equipTalisman(el.dataset.equipFu as TalismanId, si), '已装入随身');
    }
    if (el.dataset.clearFu !== undefined) {
      return toast(prog.clearTalismanSlot(Number(el.dataset.clearFu)), '灵符已揭下');
    }
    if (el.dataset.pack !== undefined && el.dataset.slot !== undefined) {
      return toast(prog.packPill(el.dataset.pack as PillId, Number(el.dataset.slot)));
    }
    if (el.dataset.clearSlot !== undefined) {
      return toast(prog.clearPillSlot(Number(el.dataset.clearSlot)));
    }
    if (el.dataset.equipArmor) {
      const r = prog.equipArmor(el.dataset.equipArmor);
      if (r === true) { h.refresh(); return; }
      return toast(r);
    }
    if (el.dataset.unequipSlot) {
      const r = prog.unequipSlot(el.dataset.unequipSlot as EquipSlotId);
      if (r === true) { h.refresh(); return; }
      return toast(r);
    }
    if (el.dataset.unequipUid) {
      const r = prog.unequipArmor(el.dataset.unequipUid);
      if (r === true) { h.refresh(); return; }
      return toast(r);
    }
    if (el.dataset.equipFilter !== undefined) {
      const f = isGearFilter(el.dataset.equipFilter) ? el.dataset.equipFilter : 'all';
      prepFocus = f === 'all' ? 'info' : f;
      renderHub(root, prog, h, { tab: 'prep', equipFilter: f });
      return;
    }
    if (el.dataset.filterSlot) {
      const f = isGearFilter(el.dataset.filterSlot) ? el.dataset.filterSlot : 'all';
      renderHub(root, prog, h, { tab: 'prep', equipFilter: f });
      return;
    }
    if (el.dataset.startAct !== undefined) {
      const ai = Number(el.dataset.startAct);
      if (Number.isFinite(ai) && ai <= unlocked) h.start(false, ai);
      return;
    }
    switch (el.dataset.act) {
      case 'start': h.start(false, 0); break; // full campaign from act 1
      case 'boss': h.start(true, unlocked); break;
      case 'dojo': h.training?.(); break;
      case 'title': h.title(); break;
      case 'reset': h.refresh(); renderHub(root, prog, h, { confirmReset: true, tab: currentTab }); break;
      case 'reset-no': h.refresh(); break;
      case 'reset-yes': prog.reset(); h.refresh(); break;
    }
  };
}
