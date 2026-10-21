// What can be simulated in a product's compound tree, and what holds up its clear date (spec v2.1 §1, v2.2 §2–4).
// Shared by the scenario model and the validator's progress report so both always agree.

import { effectiveRelevance, hasIntrinsicKinetics, hasZeroOrderRate, isReviewed } from './schema';
import type { ClinicalRelevance, Compound } from './types';

export type SimKind = 'intrinsic' | 'formation-limited' | 'zero-order';

export interface MissingCompound {
  id: string;
  relevance: ClinicalRelevance;
  /** Set when the compound has kinetics but is only formed through an inactive compound that can't be simulated. */
  via?: string;
}

export interface TreePlan {
  /** Components (depth 0) and every downstream compound, breadth-first. */
  tree: { id: string; depth: number; root: string }[];
  /** Parents before children, over the reachable subgraph. */
  topo: string[];
  /** In-tree parents of each compound. */
  parents: Map<string, string[]>;
  included: Map<string, SimKind>;
  /** Included only because the "treat unknown as formation-limited" setting is on. */
  assumedFormationLimited: Set<string>;
  /** Active or unknown-relevance compounds that can't be simulated: the product is "Incomplete". */
  missing: MissingCompound[];
  /** Inactive compounds with unknown kinetics: not simulated and excluded from the clear date. */
  excluded: string[];
  /** Endogenous compounds with unknown kinetics and reviewed relevance: not simulated, never block (v2.2 §4). */
  endogenous: string[];
  /** Compounds with kinetics mode "not-modelled" (a component: the product is "Not modelled"). */
  notModelled: string[];
}

export function planProductTree(
  compounds: Map<string, Compound>,
  childrenOf: (id: string) => string[],
  roots: string[],
  dosed: Set<string>,
  unknownAsFL: boolean,
): TreePlan {
  const tree = roots.map((id) => ({ id, depth: 0, root: id }));
  const seen = new Set(roots);
  for (let i = 0; i < tree.length; i++)
    for (const ch of childrenOf(tree[i].id))
      if (!seen.has(ch)) {
        seen.add(ch);
        tree.push({ id: ch, depth: tree[i].depth + 1, root: tree[i].root });
      }

  const parents = new Map<string, string[]>();
  for (const id of seen) for (const ch of childrenOf(id)) if (seen.has(ch)) parents.set(ch, [...(parents.get(ch) ?? []), id]);
  const indeg = new Map([...seen].map((id) => [id, (parents.get(id) ?? []).length]));
  const queue = [...seen].filter((id) => indeg.get(id) === 0);
  const topo: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    topo.push(id);
    for (const ch of childrenOf(id))
      if (seen.has(ch)) {
        indeg.set(ch, indeg.get(ch)! - 1);
        if (indeg.get(ch) === 0) queue.push(ch);
      }
  }

  const included = new Map<string, SimKind>();
  const assumedFormationLimited = new Set<string>();
  const missing: MissingCompound[] = [];
  const excluded: string[] = [];
  const endogenous: string[] = [];
  const notModelled: string[] = [];
  // Not simulated, and already accounted for by an "Incomplete" / "Not modelled" entry upstream (or itself).
  const counted = new Set<string>();
  const ownKind = (c: Compound): SimKind | null =>
    hasZeroOrderRate(c) ? 'zero-order' : c.kinetics.mode === 'intrinsic' && hasIntrinsicKinetics(c) ? 'intrinsic' : null;
  for (const id of topo) {
    const c = compounds.get(id);
    if (!c) continue;
    const relevance = effectiveRelevance(c, dosed);
    if (c.kinetics.mode === 'not-modelled') {
      notModelled.push(id);
      counted.add(id);
      continue;
    }
    if (roots.includes(id)) {
      const kind = ownKind(c);
      if (kind) included.set(id, kind);
      else {
        missing.push({ id, relevance: 'active' });
        counted.add(id);
      }
      continue;
    }
    const ps = parents.get(id) ?? [];
    const skipEndogenous = () => {
      if (!c.endogenous || !isReviewed(c, 'relevance')) return false;
      endogenous.push(id);
      return true;
    };
    if (!ps.some((p) => included.has(p))) {
      // Downstream of something that can't be simulated.
      if (relevance === 'inactive') continue;
      if (ps.some((p) => counted.has(p))) counted.add(id);
      else if (!skipEndogenous()) {
        missing.push({ id, relevance, via: ps.find((p) => excluded.includes(p)) ?? ps[0] });
        counted.add(id);
      }
      continue;
    }
    const mode = c.kinetics.mode;
    const kind = ownKind(c);
    if (kind) included.set(id, kind);
    else if (mode === 'formation-limited') included.set(id, 'formation-limited');
    else if (mode === 'unknown' && unknownAsFL) {
      included.set(id, 'formation-limited');
      assumedFormationLimited.add(id);
    } else if (relevance === 'inactive') excluded.push(id);
    else if (!skipEndogenous()) {
      missing.push({ id, relevance });
      counted.add(id);
    }
  }
  return { tree, topo, parents, included, assumedFormationLimited, missing, excluded, endogenous, notModelled };
}
