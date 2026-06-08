import { untracked } from 'mobx';

export type MobxReactionNode = {
  dependenciesState_?: number;
  onBecomeStale_?: () => void;
  schedule_?: () => void;
  runReaction_?: () => void;
  observers_?: Set<MobxReactionNode>;
};

export type MobxAtom = {
  reportChanged?: () => void;
  set?: (value: unknown) => void;
  derivation?: unknown;
  get?: () => unknown;
  dependenciesState_?: number;
  trackAndCompute?: () => boolean;
  constructor?: new (
    value: unknown,
    enhancer: (value: unknown) => unknown,
    name: string,
  ) => MobxAtom;
  lowestObserverState_?: number;
  observers_?: Set<MobxReactionNode>;
};

export type MobxObjectAdministration = {
  name_: string;
  target_?: object;
  proxy_?: object;
  values_: Map<string, MobxAtom>;
  keysAtom_?: { reportChanged?: () => void };
  setObservablePropValue_(key: string, value: unknown): boolean | null;
  defineObservableProperty_(
    key: string,
    value: unknown,
    enhancer?: (value: unknown) => unknown,
    proxyTrap?: boolean,
  ): boolean | null;
  delete_(key: string, proxyTrap?: boolean): boolean | null;
};

const administrationByObject = new WeakMap<object, MobxObjectAdministration>();
const hostMobxSymbols = new Set<symbol>();

function isMobxAdministration(
  value: unknown,
): value is MobxObjectAdministration {
  return (
    !!value &&
    typeof value === 'object' &&
    'values_' in value &&
    (value as MobxObjectAdministration).values_ instanceof Map &&
    typeof (value as MobxObjectAdministration).setObservablePropValue_ ===
      'function'
  );
}

function rememberHostMobxSymbol(target: object, adm: MobxObjectAdministration) {
  for (const symbol of Object.getOwnPropertySymbols(target)) {
    if (target[symbol as keyof object] === adm) {
      hostMobxSymbols.add(symbol);
      return;
    }
  }
}

export function registerMobxAdministration(
  object: object,
  adm: MobxObjectAdministration,
) {
  administrationByObject.set(object, adm);

  if (adm.target_) {
    administrationByObject.set(adm.target_, adm);
    rememberHostMobxSymbol(adm.target_, adm);
  }

  if (adm.proxy_) {
    administrationByObject.set(adm.proxy_, adm);
  }
}

export function findMobxAdministration(
  object: object,
): MobxObjectAdministration | undefined {
  const cached = administrationByObject.get(object);

  if (cached) {
    return cached;
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    const candidate = (object as Record<symbol, unknown>)[symbol];

    if (isMobxAdministration(candidate)) {
      registerMobxAdministration(object, candidate);
      return candidate;
    }
  }

  for (const symbol of hostMobxSymbols) {
    const candidate = (object as Record<symbol, unknown>)[symbol];

    if (isMobxAdministration(candidate)) {
      registerMobxAdministration(object, candidate);
      return candidate;
    }
  }

  return undefined;
}

export function ensureMobxPropertyAtomLoaded(
  object: object,
  key: string,
  adm?: MobxObjectAdministration,
): MobxObjectAdministration | undefined {
  const admin = adm ?? findMobxAdministration(object);

  if (!admin) {
    return undefined;
  }

  registerMobxAdministration(object, admin);

  if (admin.values_.has(key)) {
    return admin;
  }

  try {
    untracked(() => {
      void (object as Record<string, unknown>)[key];
    });
  } catch {
    // Getter may throw while devtools still allow editing a fallback value.
  }

  return admin;
}

export function getMobxPropertyAtom(
  object: object,
  key: string,
): MobxAtom | undefined {
  const adm = ensureMobxPropertyAtomLoaded(object, key);
  return adm?.values_.get(key);
}

export function getMobxComputedPropertyKeys(object: object): string[] {
  const adm = findMobxAdministration(object);

  if (!adm) {
    return [];
  }

  const keys: string[] = [];

  for (const [key, atom] of adm.values_) {
    if (typeof atom.derivation === 'function') {
      keys.push(key);
    }
  }

  return keys;
}

export function isMobxComputedProperty(object: object, key: string) {
  const atom = getMobxPropertyAtom(object, key);
  return !!atom && typeof atom.derivation === 'function';
}

export function resolveMobxObjectCandidates(object: object): object[] {
  const adm = findMobxAdministration(object);
  const candidates = new Set<object>([object]);

  if (adm?.target_) {
    candidates.add(adm.target_);
  }

  if (adm?.proxy_) {
    candidates.add(adm.proxy_);
  }

  return [...candidates];
}

export function objectsReferentiallyEqual(a: object, b: object) {
  if (a === b) {
    return true;
  }

  const aCandidates = resolveMobxObjectCandidates(a);
  const bCandidates = new Set(resolveMobxObjectCandidates(b));

  return aCandidates.some((candidate) => bCandidates.has(candidate));
}
