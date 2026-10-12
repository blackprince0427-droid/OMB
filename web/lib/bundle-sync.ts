import { SEED_USER, type CompanyBundle, type OperationLog } from "./office.ts";

export type SyncCacheEntry = {
  baseRevision: number;
  dirty: boolean;
  bundle: CompanyBundle;
  logs: OperationLog[];
};

export type RemoteBundle = {
  revision: number;
  bundle: CompanyBundle;
  logs: OperationLog[];
};

export type RemoteRefreshPlan = "noop" | "adopt" | "prompt";

export function planRemoteRefresh(input: { dirty: boolean; baseRevision: number; remoteRevision: number }): RemoteRefreshPlan {
  if (input.remoteRevision === input.baseRevision) return "noop";
  if (input.dirty) return "prompt";
  return "adopt";
}

export type SyncPlan =
  | { action: "use-remote" }
  | { action: "upload"; baseRevision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { action: "prompt"; bundle: CompanyBundle; logs: OperationLog[] };

function sameSnapshot(bundle: CompanyBundle, logs: OperationLog[], remote: RemoteBundle): boolean {
  return JSON.stringify({ bundle, logs }) === JSON.stringify({ bundle: remote.bundle, logs: remote.logs });
}

export function isUntouchedSeed(remote: RemoteBundle): boolean {
  if (remote.revision !== 1 || remote.logs.length !== 0) return false;
  const bundle = remote.bundle;
  if (
    bundle.departments.length ||
    bundle.positions.length ||
    bundle.assignments.length ||
    bundle.permissions.length ||
    bundle.records.length ||
    bundle.tags.length ||
    bundle.tasks.length ||
    bundle.invites.length
  ) {
    return false;
  }
  if (bundle.users.length !== 1) return false;
  const user = bundle.users[0];
  return (
    user.account === SEED_USER.account &&
    user.password === SEED_USER.password &&
    user.name === SEED_USER.name &&
    user.role === SEED_USER.role &&
    user.createdAt === SEED_USER.createdAt
  );
}

export function planCompanySync(input: {
  cache: SyncCacheEntry | null;
  remote: RemoteBundle;
  legacy: { bundle: CompanyBundle; logs: OperationLog[] } | null;
  legacyEligible: boolean;
}): SyncPlan {
  if (input.cache) {
    const unchanged =
      input.cache.baseRevision === input.remote.revision &&
      sameSnapshot(input.cache.bundle, input.cache.logs, input.remote);
    if (!input.cache.dirty || unchanged) return { action: "use-remote" };
    if (input.cache.baseRevision === input.remote.revision) {
      return {
        action: "upload",
        baseRevision: input.cache.baseRevision,
        bundle: input.cache.bundle,
        logs: input.cache.logs,
      };
    }
    return { action: "prompt", bundle: input.cache.bundle, logs: input.cache.logs };
  }
  if (
    input.legacyEligible &&
    input.legacy &&
    !sameSnapshot(input.legacy.bundle, input.legacy.logs, input.remote)
  ) {
    if (isUntouchedSeed(input.remote)) {
      return {
        action: "upload",
        baseRevision: input.remote.revision,
        bundle: input.legacy.bundle,
        logs: input.legacy.logs,
      };
    }
    return { action: "prompt", bundle: input.legacy.bundle, logs: input.legacy.logs };
  }
  return { action: "use-remote" };
}
