import { planCompanySync, type SyncCacheEntry } from "./bundle-sync.ts";
import type { OfficeCache } from "./office-cache.ts";
import { logsOf } from "./office-cache.ts";
import {
  companyForLocation,
  emptyBundle,
  isConsolePath,
  type Company,
  type CompanyBundle,
  type OperationLog,
} from "./office.ts";
import {
  fetchBundle,
  fetchRegistry,
  insertCompanyRemote,
  putBundle,
  type BundleResult,
  type PutResult,
  type RegistryResult,
} from "./office-api.ts";

export type OfficeClient = {
  registry: () => Promise<RegistryResult>;
  bundle: (companyId: string) => Promise<BundleResult>;
  put: (input: {
    companyId: string;
    baseRevision: number;
    bundle: CompanyBundle;
    logs: OperationLog[];
    force?: boolean;
  }) => Promise<PutResult>;
  insert: (input: { company: Company; bundle: CompanyBundle; logs: OperationLog[] }) => Promise<{ ok: true; companies: Company[] } | { ok: false; error: string }>;
};

export const httpOfficeClient: OfficeClient = {
  registry: fetchRegistry,
  bundle: fetchBundle,
  put: putBundle,
  insert: insertCompanyRemote,
};

export type LoadConflict = {
  companyId: string;
  localBundle: CompanyBundle;
  localLogs: OperationLog[];
  remote: { revision: number; bundle: CompanyBundle; logs: OperationLog[] };
};

export type LoadOfficeResult = {
  companyState: "ready" | "missing" | "disabled" | "backend" | "offline";
  company: Company | null;
  companies: Company[];
  bundle: CompanyBundle;
  logs: OperationLog[];
  revision: number;
  dirty: boolean;
  conflict: LoadConflict | null;
  cache: OfficeCache;
  markMigrated: boolean;
  offline: boolean;
  requestedCompanyIds: string[];
};

function resultFromCache(input: {
  companyState: LoadOfficeResult["companyState"];
  company: Company | null;
  companies: Company[];
  entry: SyncCacheEntry | null;
  cache: OfficeCache;
  offline: boolean;
}): LoadOfficeResult {
  return {
    companyState: input.companyState,
    company: input.company,
    companies: input.companies,
    bundle: input.entry?.bundle ?? emptyBundle(),
    logs: input.entry?.logs ?? [],
    revision: input.entry?.baseRevision ?? 0,
    dirty: input.entry?.dirty ?? false,
    conflict: null,
    cache: input.cache,
    markMigrated: false,
    offline: input.offline,
    requestedCompanyIds: [],
  };
}

export async function loadOfficeScreen(input: {
  path: string;
  origin: string;
  cache: OfficeCache;
  legacy: { companies: Company[]; bundles: Record<string, CompanyBundle> } | null;
  legacyLogs: OperationLog[];
  legacyEligible: boolean;
  client?: OfficeClient;
}): Promise<LoadOfficeResult> {
  const client = input.client ?? httpOfficeClient;
  const consolePath = isConsolePath(input.path);
  const registry = await client.registry();
  if (!registry.ok) {
    const companies = input.cache.companies.length > 0 ? input.cache.companies : input.legacy?.companies ?? [];
    if (consolePath) {
      return resultFromCache({ companyState: "backend", company: null, companies, entry: null, cache: input.cache, offline: true });
    }
    const company = companyForLocation(companies, input.origin, input.path);
    if (!company) {
      return resultFromCache({
        companyState: companies.length === 0 ? "offline" : "missing",
        company: null,
        companies,
        entry: null,
        cache: input.cache,
        offline: true,
      });
    }
    const entry = input.cache.entries[company.id] ?? null;
    const legacyBundle = input.legacy?.bundles[company.id];
    const fallback = entry ?? (legacyBundle ? { baseRevision: 0, dirty: true, bundle: legacyBundle, logs: logsOf(input.legacyLogs, company.id) } : null);
    return resultFromCache({
      companyState: company.disabled ? "disabled" : fallback ? "ready" : "offline",
      company,
      companies,
      entry: fallback,
      cache: input.cache,
      offline: true,
    });
  }

  let companies = registry.companies;
  const cache: OfficeCache = { companies, entries: { ...input.cache.entries } };
  if (input.legacyEligible && input.legacy) {
    for (const company of input.legacy.companies) {
      if (companies.some((item) => item.id === company.id)) continue;
      const inserted = await client.insert({
        company,
        bundle: input.legacy.bundles[company.id] ?? emptyBundle(),
        logs: logsOf(input.legacyLogs, company.id),
      });
      if (inserted.ok) companies = inserted.companies;
    }
    cache.companies = companies;
  }

  const active = consolePath ? null : companyForLocation(companies, input.origin, input.path);
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (seen.has(id) || !companies.some((item) => item.id === id)) return;
    seen.add(id);
    ids.push(id);
  };
  if (active) add(active.id);
  for (const [id, entry] of Object.entries(cache.entries)) {
    if (entry.dirty) add(id);
  }
  if (input.legacyEligible && input.legacy) {
    for (const company of input.legacy.companies) add(company.id);
  }

  let conflict: LoadConflict | null = null;
  let offline = false;
  for (const id of ids) {
    const remote = await client.bundle(id);
    if (!remote.ok) {
      offline = true;
      continue;
    }
    if (!remote.found) continue;
    const entry = cache.entries[id] ?? null;
    const legacyBundle = input.legacyEligible && input.legacy?.bundles[id]
      ? { bundle: input.legacy.bundles[id], logs: logsOf(input.legacyLogs, id) }
      : null;
    const plan = planCompanySync({
      cache: entry,
      remote,
      legacy: legacyBundle,
      legacyEligible: input.legacyEligible,
    });
    if (plan.action === "use-remote") {
      cache.entries[id] = { baseRevision: remote.revision, dirty: false, bundle: remote.bundle, logs: remote.logs };
      continue;
    }
    if (plan.action === "upload") {
      const put = await client.put({
        companyId: id,
        baseRevision: plan.baseRevision,
        bundle: plan.bundle,
        logs: plan.logs,
      });
      if (put.ok) {
        cache.entries[id] = { baseRevision: put.revision, dirty: false, bundle: put.bundle, logs: put.logs };
        continue;
      }
      if (put.conflict) {
        cache.entries[id] = { baseRevision: plan.baseRevision, dirty: true, bundle: plan.bundle, logs: plan.logs };
        conflict ??= { companyId: id, localBundle: plan.bundle, localLogs: plan.logs, remote: put };
        continue;
      }
      offline = true;
      cache.entries[id] = { baseRevision: plan.baseRevision, dirty: true, bundle: plan.bundle, logs: plan.logs };
      continue;
    }
    cache.entries[id] = {
      baseRevision: entry?.baseRevision ?? remote.revision - 1,
      dirty: true,
      bundle: plan.bundle,
      logs: plan.logs,
    };
    conflict ??= { companyId: id, localBundle: plan.bundle, localLogs: plan.logs, remote };
  }

  const entry = active ? cache.entries[active.id] ?? null : null;
  const companyState = consolePath
    ? "backend"
    : !active
      ? "missing"
      : active.disabled
        ? "disabled"
        : "ready";
  return {
    companyState,
    company: active,
    companies,
    bundle: entry?.bundle ?? emptyBundle(),
    logs: entry?.logs ?? [],
    revision: entry?.baseRevision ?? 0,
    dirty: entry?.dirty ?? false,
    conflict,
    cache,
    markMigrated: true,
    offline,
    requestedCompanyIds: ids,
  };
}
