/** Remote DLC catalog types (DLCServer schemaVersion 1). */

export type DlcKind = 'menpai' | 'pack';

export interface DlcRemoteEntry {
  id: string;
  name: string;
  kind: DlcKind;
  version: string;
  description: string;
  size?: number;
  md5?: string;
  /** Absolute or server-relative URL to .tgz / .zip */
  download: string;
  /** Prefer for in-browser enable: content.json */
  content?: string;
  builtin?: boolean;
}

export interface DlcCatalog {
  schemaVersion: number;
  generatedAt?: string;
  packages: DlcRemoteEntry[];
}

/** Data-only pack body served at packages/<id>/content.json */
export interface DlcContentBody {
  talismanScripts?: unknown[];
  talismans?: unknown[];
  pills?: unknown[];
  /** B-tier / A2: 攻击盒；apply 须早于 skills / behaviors（attackKey 可解析） */
  attacks?: unknown[];
  /** B-tier / X1: 攻击姿态关键帧；apply 须在 animRecipes / talismanScripts / skills 之前（poseId） */
  poses?: unknown[];
  /** B-tier / X1: 特效配方；apply 须在 animRecipes / talismanScripts / skills 之前（recipeId） */
  fxRecipes?: unknown[];
  /** B-tier / R1: 图集；apply 宜早于 weapons（sheetId）；src 须 ./art/ */
  sheets?: unknown[];
  /** B-tier / R1: 音效别名；apply 宜早于 talismanScripts / skills（synth 或 ./art/） */
  sfx?: unknown[];
  /** B-tier / R1: 投射物；apply 宜在 volleys / behaviors 之前（projectileId） */
  projectiles?: unknown[];
  /** B-tier / R1: 弹幕模板；apply 宜在 talismanScripts 之前（volleyId / style） */
  volleys?: unknown[];
  /** B-tier / R1: 幕氛围；apply 宜在 stages 之前（backdropTheme） */
  backdrops?: unknown[];
  /** B-tier: 招式样子配方；apply 须在 skills 之前（castAnim 字符串解析） */
  animRecipes?: unknown[];
  skills?: unknown[];
  neigong?: unknown[];
  /** B-tier: 普攻链套路；apply 须在 weapons 之前（combatStyleId） */
  combatStyles?: unknown[];
  /** B-tier: 兵刃外观积木；apply 须在 weapons 之前（lookId） */
  weaponLooks?: unknown[];
  weapons?: unknown[];
  materials?: unknown[];
  armorSets?: unknown[];
  armorPieces?: unknown[];
  wepAffixes?: unknown[];
  affixes?: unknown[];
  /** B-tier: 剪影（长相）；apply 须在 enemies 之前（silhouetteId） */
  silhouettes?: unknown[];
  /** B-tier: 行为配方（怎么打）；apply 须在 enemies 之前（behaviorId → steps） */
  behaviors?: unknown[];
  /** B-tier: 碰撞盒；apply 须在 enemies 之前（colliderId） */
  colliders?: unknown[];
  enemies?: unknown[];
  eliteMods?: unknown[];
  titles?: unknown[];
  /** C-tier / G1: Boss 招式目录；apply 须在 bossKits 之前（kit 只引用已登记 move id） */
  bossMoves?: unknown[];
  bossKits?: unknown[];
  fragments?: unknown[];
  stages?: unknown[];
  /**
   * C-tier / Act1: 幕池（整幕默认权重 / Lore / 幕间字幕）。
   * 嵌套 pools/beats：apply 调 ctx.acts.pool / beat（ActService 无 .add，禁止 add('acts', …)）。
   */
  acts?: {
    /** 槽位覆盖：actIndex 必填；同槽后登记盖先登记（SlotStack） */
    pools?: Array<{
      actIndex: number;
      /** Soft-ref ctx.bossKits id (open string; Act1.5) */
      kit: string;
      tint: 'jade' | 'ink' | 'blood' | 'ash';
      eliteWeights: Record<string, number>;
      dropLean: string[];
      blueprintLean: string[];
      setLean: string[];
      loreLine: string;
    }>;
    /** 幕间字幕：fromAct = 离开的幕序；when 建议固定 betweenActs */
    beats?: Array<{
      fromAct: number;
      id: string;
      when: 'betweenActs' | string;
      title: string;
      subtitle?: string;
      holdFrames?: number;
      slowmo?: number;
    }>;
  };
}
