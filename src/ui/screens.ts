import type { Stats } from '../game';
import type { RunRewards } from '../meta/types';
import { MATERIAL_BY_ID, type MaterialId } from '../meta/materials';
import { listDlcStore, listDlcStoreAsync, enableDlcAsync, type DlcKind, type DlcStoreEntry } from '../menpai';

export interface ScreenHandlers {
  start: (boss?: boolean) => void;
  resume: () => void;
  restart: () => void;
  title: () => void;
  hub: () => void;
  toggleMute: () => boolean;
  click: () => void;
}

const fmtTime = (frames: number) => {
  const s = Math.floor(frames / 60);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function grade(s: Stats): { letter: string; name: string } {
  const score = s.maxCombo * 2 + s.parries * 6 + s.kills * 2 + s.dodges * 2 - s.damageTaken * 0.4 - (s.time / 60) * 0.25;
  if (score >= 120) return { letter: 'S', name: '一代宗师' };
  if (score >= 80) return { letter: 'A', name: '江湖剑客' };
  if (score >= 40) return { letter: 'B', name: '夜行游侠' };
  return { letter: 'C', name: '初入江湖' };
}

function rewardBlock(r: RunRewards | null | undefined): string {
  if (!r) return '';
  const mats = r.loot?.materials
    ? Object.entries(r.loot.materials).filter(([, n]) => (n ?? 0) > 0)
        .map(([k, n]) => `${MATERIAL_BY_ID[k as MaterialId]?.name ?? k}×${n}`).join(' · ')
    : '';
  const bps = r.loot?.blueprints?.length ? r.loot.blueprints.join('、') : '';
  return `<div class="rewards">
    <div><em>此行血晶</em><b>+${r.crystals}</b></div>
    ${mats ? `<div><em>材料</em><b>${mats}</b></div>` : ''}
    ${bps ? `<div class="reward-lvl">图纸：${bps}</div>` : ''}
    ${r.loot?.gear ? `<div class="reward-lvl">未鉴装备 ×${r.loot.gear}</div>` : ''}
  </div>`;
}

function dlcKindLabel(kind: DlcKind, official?: boolean): string {
  if (official) return '本门';
  return kind === 'menpai' ? '门派' : '内容包';
}

function dlcRow(e: DlcStoreEntry): string {
  const status = e.enabled
    ? '<span class="dlc-status on">已启用</span>'
    : '<span class="dlc-status off">未启用</span>';
  const action = e.official
    ? '<em class="dlc-seal">正传</em>'
    : e.enabled
      ? '<em class="dlc-seal">已入册</em>'
      : `<button type="button" data-act="dlc-enable" data-id="${e.id}" data-kind="${e.kind}" class="dlc-enable">入门</button>`;
  const ver = e.version && !e.official ? `<span class="dlc-ver">卷 ${e.version}</span>` : '';
  return `<div class="dlc-row ${e.enabled ? 'enabled' : 'available'}${e.official ? ' official' : ''}">
    <div class="dlc-row-h">
      <b>${e.name}</b>
      <span class="dlc-kind">${dlcKindLabel(e.kind, e.official)}</span>
      ${ver}
      ${status}
    </div>
    <p class="dlc-lore">${e.lore}</p>
    <div class="dlc-row-f">${action}</div>
  </div>`;
}

function dlcSection(title: string, rows: DlcStoreEntry[], emptyTip: string): string {
  const body = rows.length
    ? rows.map(dlcRow).join('')
    : `<div class="dlc-empty">${emptyTip}</div>`;
  return `<section class="dlc-section">
    <h3 class="dlc-sec-title">${title}</h3>
    <div class="dlc-list">${body}</div>
  </section>`;
}

/** DOM overlay menus (title / pause / game over / victory / DLC). Hub lives in ui/hub.ts. */
export class Screens {
  current = '';
  constructor(private root: HTMLElement, private h: ScreenHandlers) {
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el) return;
      // hub owns its own click handler when shown
      if (this.current === 'hub') return;
      h.click();
      const act = el.dataset.act;
      switch (act) {
        case 'start': h.start(false); break;
        case 'boss': h.start(true); break;
        case 'resume': h.resume(); break;
        case 'restart': h.restart(); break;
        case 'title': h.title(); break;
        case 'hub': h.hub(); break;
        case 'help': this.root.querySelector('.help')?.classList.toggle('open'); break;
        case 'mute': el.textContent = h.toggleMute() ? '音效：关' : '音效：开'; break;
        case 'dlc': this.dlc(); break;
        case 'dlc-enable': {
          const id = el.dataset.id;
          const kind = el.dataset.kind as DlcKind | undefined;
          if (id && (kind === 'menpai' || kind === 'pack')) {
            void enableDlcAsync(id, kind).then(() => this.dlc());
          }
          break;
        }
      }
    });
  }

  hide(): void { this.root.innerHTML = ''; this.current = ''; this.root.className = ''; }

  private show(name: string, html: string): void {
    this.current = name;
    this.root.className = 'screen screen-' + name;
    this.root.innerHTML = html;
  }

  title(muted: boolean, summary = ''): void {
    this.show('title', `
      <div class="panel title-panel">
        <div class="logo-sub">江湖篇 · 月下刀光</div>
        <h1 class="logo">长夜安魂曲</h1>
        <div class="logo-line"></div>
        <p class="tagline">夜雨江南，剑气如霜。执刃之人，于江湖长夜中叩问刀心。</p>
        ${summary ? `<p class="save-summary">${summary}</p>` : ''}
        <div class="menu">
          <button data-act="start" class="primary">拔剑夜行</button>
          <button data-act="hub">叩山门</button>
          <button data-act="boss">挑战镇山石兽</button>
          <button data-act="dlc">DLC 商店</button>
          <button data-act="help">操作说明</button>
          <button data-act="mute">${muted ? '音效：关' : '音效：开'}</button>
        </div>
        <div class="help">
          <table>
            <tr><td>移动</td><td>A / D 或 ← →</td></tr>
            <tr><td>跳跃</td><td>W / 空格</td></tr>
            <tr><td>攻击</td><td>J（连按四段连斩）</td></tr>
            <tr><td>挑空 / 扫腿</td><td>↑+J / ↓+J</td></tr>
            <tr><td>冲刺踢</td><td>闪避中按 J</td></tr>
            <tr><td>空中连斩 / 下劈</td><td>空中 J（间隔&lt;1秒持续浮空）/ 空中 ↓+J</td></tr>
            <tr><td>格挡 / 弹反</td><td>K（敌人出招瞬间按下 = 完美弹反）</td></tr>
            <tr><td>闪避</td><td>L（闪避瞬间刀枪不入）</td></tr>
            <tr><td>气势</td><td>击打积攒，微增武功（无大招键）</td></tr>
            <tr><td>主动功法</td><td>I</td></tr>
            <tr><td>使用丹药</td><td>1–4 对应出战四槽</td></tr>
            <tr><td>暂停</td><td>Esc / P</td></tr>
          </table>
          <p class="tip">击杀物资爆落地面（品质色区分），走近拾取；图纸与未鉴装备带回山门。丹药在「丹房」炼制入库，需随身时点装入；符咒在「符箓」绘制，需用时装入贴身；未鉴装备请至铁匠铺耗血晶辨物。</p>
        </div>
      </div>`);
  }

  /** DLC 商店：优先从 DLCServer 翻册；不通则退回内置清单。「入门」不卸下. */
  dlc(): void {
    // Instant paint from cache / built-in, then refresh from server.
    this.renderDlc(listDlcStore(), '');
    void listDlcStoreAsync(true).then(({ entries, source, error }) => {
      if (this.current !== 'dlc') return;
      const note = source === 'server'
        ? '册上物什已从藏经阁（DLC 馆）对齐。'
        : error
          ? '藏经阁暂不可达，先示本机旧册。'
          : '';
      this.renderDlc(entries, note);
    });
  }

  private renderDlc(all: DlcStoreEntry[], note: string): void {
    const official = all.filter((e) => e.official);
    const menpai = all.filter((e) => e.kind === 'menpai' && !e.official);
    const packs = all.filter((e) => e.kind === 'pack');
    this.show('dlc', `
      <div class="panel dlc-panel">
        <div class="dlc-head">
          <div class="logo-sub">江湖传闻 · 门派与内容包</div>
          <h2 class="dlc-title">DLC 商店</h2>
          <div class="logo-line"></div>
          <p class="dlc-tag">灯下翻册：已入门者标「已启用」，尚在门外者可点「入门」。正传「长夜」始终在列。</p>
          ${note ? `<p class="dlc-tag dlc-source">${note}</p>` : ''}
        </div>
        <div class="dlc-scroll">
          ${dlcSection('本门正传', official, '尚无本门……')}
          ${dlcSection('可装门派', menpai, '尚无可装门派')}
          ${dlcSection('内容包', packs, '尚无内容包')}
          <p class="dlc-tip">亦可于地址栏加 <code>?menpai=门派名</code>、<code>?pack=包名</code>，或 <code>?dlc=馆址</code> 指定藏经阁。卸下请于山门用控制台；出征途中莫动，以免正在用的物事消失。</p>
        </div>
        <div class="menu dlc-menu">
          <button data-act="title" class="primary">返回标题</button>
        </div>
      </div>`);
  }

  pause(): void {
    this.show('pause', `
      <div class="panel small">
        <h2>暂停</h2>
        <div class="menu">
          <button data-act="resume" class="primary">继续</button>
          <button data-act="restart">重新开始</button>
          <button data-act="hub">返回山门</button>
          <button data-act="title">返回标题</button>
        </div>
      </div>`);
  }

  gameOver(stats?: Stats, rewards?: RunRewards): void {
    this.show('over', `
      <div class="panel small end-panel">
        <h2 class="blood">力竭而亡</h2>
        <p class="tagline">江湖路远……此行所获，仍可带回山门。</p>
        ${rewardBlock(rewards)}
        <div class="menu">
          <button data-act="restart" class="primary">再来一次</button>
          <button data-act="hub">返回山门</button>
          <button data-act="title">返回标题</button>
        </div>
      </div>`);
  }

  victory(s: Stats, rewards?: RunRewards): void {
    const g = grade(s);
    this.show('win', `
      <div class="panel end-panel">
        <h2 class="gold">石兽归寂</h2>
        <p class="tagline">镇山石兽化为碎石，古刹钟声渐歇。</p>
        <div class="grade"><span>${g.letter}</span><em>${g.name}</em></div>
        ${rewardBlock(rewards)}
        <div class="stats">
          <div><em>用时</em><b>${fmtTime(s.time)}</b></div>
          <div><em>最大连击</em><b>${s.maxCombo}</b></div>
          <div><em>完美弹反</em><b>${s.parries}</b></div>
          <div><em>完美闪避</em><b>${s.dodges}</b></div>
          <div><em>击杀</em><b>${s.kills}</b></div>
          <div><em>承受伤害</em><b>${Math.round(s.damageTaken)}</b></div>
        </div>
        <div class="menu row">
          <button data-act="restart" class="primary">再战一次</button>
          <button data-act="hub">返回山门</button>
          <button data-act="title">返回标题</button>
        </div>
      </div>`);
  }
}
