import type { Company, OperationLog } from "./office.ts";
import type { SyncCacheEntry } from "./bundle-sync.ts";
import { COMPANIES_KEY, normalizeCompanies, normalizeCompanyBundle, normalizeLogs } from "./storage.ts";

export const SYNC_CACHE_KEY = "osp-dev-v126-cache";
export const MIGRATED_KEY = "osp-dev-v126-migrated";

export type OfficeCache = {
  companies: Company[];
  entries: Record<string, SyncCacheEntry>;
};

export function emptyOfficeCache(): OfficeCache {
  return { companies: [], entries: {} };
}

function normalizeEntry(companyId: string, value: unknown): SyncCacheEntry | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SyncCacheEntry>;
  if (typeof item.baseRevision !== "number" || typeof item.dirty !== "boolean") return null;
  return {
    baseRevision: item.baseRevision,
    dirty: item.dirty,
    bundle: normalizeCompanyBundle(companyId, item.bundle),
    logs: normalizeLogs(item.logs).filter((log) => log.companyId === companyId),
  };
}

export function loadOfficeCache(): OfficeCache {
  if (typeof window === "undefined") return emptyOfficeCache();
  try {
    const raw = window.localStorage.getItem(SYNC_CACHE_KEY);
    if (!raw) return emptyOfficeCache();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyOfficeCache();
    const source = parsed as { companies?: unknown; entries?: unknown };
    const entries: Record<string, SyncCacheEntry> = {};
    if (source.entries && typeof source.entries === "object" && !Array.isArray(source.entries)) {
      for (const [companyId, value] of Object.entries(source.entries)) {
        const entry = normalizeEntry(companyId, value);
        if (entry) entries[companyId] = entry;
      }
    }
    return { companies: normalizeCompanies(source.companies), entries };
  } catch {
    return emptyOfficeCache();
  }
}

export function saveOfficeCache(cache: OfficeCache): void {
  window.localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify(cache));
  window.localStorage.setItem(COMPANIES_KEY, JSON.stringify(cache.companies));
}

export function legacyEligible(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MIGRATED_KEY) !== "1";
}

export function markMigrated(): void {
  window.localStorage.setItem(MIGRATED_KEY, "1");
}

export function logsOf(logs: OperationLog[], companyId: string): OperationLog[] {
  return logs.filter((item) => item.companyId === companyId);
}
