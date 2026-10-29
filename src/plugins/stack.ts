/**
 * Layered catalogs backing the Cordis content services.
 *
 * Every entry belongs to whichever plugin registered it. Registering an id
 * (or campaign slot) that already exists stacks on top: the newest entry wins
 * and takes over the original list position (order is preserved). When the
 * owning plugin unloads, its entry is removed and the previous one (if any)
 * comes back in the same position.
 *
 * `list` / `map` are live objects mutated in place, so module-level aliases
 * such as `WEAPONS` / `WEAPON_BY_ID` keep working across load / unload.
 */

interface Layer<T> { def: T }

/** Id-keyed catalog: dense list in first-registration order + id map. */
export class KeyedStack<T> {
  readonly list: T[] = [];
  readonly map: Record<string, T> = Object.create(null);
  private layers = new Map<string, Layer<T>[]>();

  constructor(private onChange?: () => void) {}

  /** Push a definition; returns a remover for exactly this layer. */
  push(key: string, def: T): () => void {
    const layer: Layer<T> = { def };
    let stack = this.layers.get(key);
    if (!stack) this.layers.set(key, (stack = []));
    const prev = stack[stack.length - 1];
    stack.push(layer);
    if (prev) {
      const i = this.list.indexOf(prev.def);
      if (i >= 0) this.list[i] = def;
      else this.list.push(def);
    } else {
      this.list.push(def);
    }
    this.map[key] = def;
    this.onChange?.();
    return () => this.remove(key, layer);
  }

  private remove(key: string, layer: Layer<T>): void {
    const stack = this.layers.get(key);
    if (!stack) return;
    const at = stack.indexOf(layer);
    if (at < 0) return;
    const wasTop = at === stack.length - 1;
    stack.splice(at, 1);
    if (wasTop) {
      const i = this.list.indexOf(layer.def);
      const next = stack[stack.length - 1];
      if (next) {
        if (i >= 0) this.list[i] = next.def;
        this.map[key] = next.def;
      } else {
        if (i >= 0) this.list.splice(i, 1);
        delete this.map[key];
      }
    }
    if (!stack.length) this.layers.delete(key);
    this.onChange?.();
  }

  /** How many layers sit under this key (1 = only one owner). */
  depth(key: string): number {
    return this.layers.get(key)?.length ?? 0;
  }
}

/** Slot-keyed catalog (campaign acts): list index === slot; holes are `undefined`. */
export class SlotStack<T> {
  readonly list: T[] = [];
  private layers = new Map<number, Layer<T>[]>();

  constructor(private onChange?: () => void) {}

  push(slot: number, def: T): () => void {
    const layer: Layer<T> = { def };
    let stack = this.layers.get(slot);
    if (!stack) this.layers.set(slot, (stack = []));
    stack.push(layer);
    while (this.list.length <= slot) this.list.push(undefined as unknown as T);
    this.list[slot] = def;
    this.onChange?.();
    return () => this.remove(slot, layer);
  }

  private remove(slot: number, layer: Layer<T>): void {
    const stack = this.layers.get(slot);
    if (!stack) return;
    const at = stack.indexOf(layer);
    if (at < 0) return;
    const wasTop = at === stack.length - 1;
    stack.splice(at, 1);
    if (wasTop) {
      const next = stack[stack.length - 1];
      this.list[slot] = next ? next.def : (undefined as unknown as T);
    }
    if (!stack.length) this.layers.delete(slot);
    // Trim trailing holes so the campaign shrinks back after an unload.
    while (this.list.length && this.list[this.list.length - 1] === undefined) this.list.pop();
    this.onChange?.();
  }

  /** Dense count of occupied slots (trailing holes ignored). */
  length(): number {
    let n = 0;
    for (let i = 0; i < this.list.length; i++) if (this.list[i]) n = i + 1;
    return n;
  }

  /** Clamp to the campaign; falls back to the first occupied slot. */
  clamped(slot: number): T | undefined {
    const n = this.length();
    const i = Math.max(0, Math.min(Math.max(0, n - 1), slot | 0));
    const v = this.list[i];
    if (v) return v;
    for (const x of this.list) if (x) return x;
    return undefined;
  }
}
