import type { Company, CompanyBundle, OperationLog } from "./office.ts";
import { normalizeCompanies, normalizeCompanyBundle, normalizeLogs } from "./storage.ts";

export type RegistryResult = { ok: true; companies: Company[] } | { ok: false; offline: true };

export type BundleResult =
  | { ok: true; found: false }
  | { ok: true; found: true; revision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { ok: false; offline: true };

export type PutResult =
  | { ok: true; revision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { ok: false; conflict: true; revision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { ok: false; conflict?: false; offline: true; error: string };

export type CreateCompanyInput = {
  name: string;
  website: string;
  ceoName: string;
  account: string;
  password: string;
};

export type CreateCompanyResult =
  | { ok: true; companies: Company[]; company: Company; revision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readBundleBody(value: unknown, companyId: string): { revision: number; bundle: CompanyBundle; logs: OperationLog[] } | null {
  const body = asRecord(value);
  if (!body || typeof body.revision !== "number") return null;
  return {
    revision: body.revision,
    bundle: normalizeCompanyBundle(companyId, body.bundle),
    logs: normalizeLogs(body.logs).filter((item) => item.companyId === companyId),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchRegistry(): Promise<RegistryResult> {
  try {
    const response = await fetch("/api/office/registry", { cache: "no-store" });
    if (!response.ok) return { ok: false, offline: true };
    const body = asRecord(await readJson(response));
    return { ok: true, companies: normalizeCompanies(body?.companies) };
  } catch {
    return { ok: false, offline: true };
  }
}

export async function fetchBundle(companyId: string): Promise<BundleResult> {
  try {
    const response = await fetch(`/api/office/bundle?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
    if (response.status === 404) return { ok: true, found: false };
    if (!response.ok) return { ok: false, offline: true };
    const parsed = readBundleBody(await readJson(response), companyId);
    if (!parsed) return { ok: false, offline: true };
    return { ok: true, found: true, ...parsed };
  } catch {
    return { ok: false, offline: true };
  }
}

export async function putBundle(input: {
  companyId: string;
  baseRevision: number;
  bundle: CompanyBundle;
  logs: OperationLog[];
  force?: boolean;
}): Promise<PutResult> {
  try {
    const response = await fetch("/api/office/bundle", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const parsed = readBundleBody(await readJson(response), input.companyId);
    if (response.status === 409 && parsed) return { ok: false, conflict: true, ...parsed };
    if (!response.ok || !parsed) return { ok: false, offline: true, error: "暫時連不上公司資料，變更先留在這台。" };
    return { ok: true, ...parsed };
  } catch {
    return { ok: false, offline: true, error: "暫時連不上公司資料，變更先留在這台。" };
  }
}

export async function createCompanyRemote(input: CreateCompanyInput): Promise<CreateCompanyResult> {
  try {
    const response = await fetch("/api/office/registry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = asRecord(await readJson(response));
    if (!response.ok) return { ok: false, error: typeof body?.error === "string" ? body.error : "暫時連不上公司資料，公司尚未建立。" };
    const companies = normalizeCompanies(body?.companies);
    const company = normalizeCompanies(body?.company ? [body.company] : [])[0];
    const revision = typeof body?.revision === "number" ? body.revision : 0;
    if (!company || revision < 1) return { ok: false, error: "公司資料不正確。" };
    return {
      ok: true,
      companies,
      company,
      revision,
      bundle: normalizeCompanyBundle(company.id, body?.bundle),
      logs: normalizeLogs(body?.logs).filter((item) => item.companyId === company.id),
    };
  } catch {
    return { ok: false, error: "暫時連不上公司資料，公司尚未建立。" };
  }
}

export async function disableCompanyRemote(name: string): Promise<{ ok: true; companies: Company[]; companyId: string; revision: number; logs: OperationLog[] } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/office/registry/disable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = asRecord(await readJson(response));
    if (!response.ok) return { ok: false, error: typeof body?.error === "string" ? body.error : "暫時連不上公司資料，尚未停用。" };
    const companyId = typeof body?.companyId === "string" ? body.companyId : "";
    if (!companyId) return { ok: false, error: "找不到此公司。" };
    return {
      ok: true,
      companies: normalizeCompanies(body?.companies),
      companyId,
      revision: typeof body?.revision === "number" ? body.revision : 1,
      logs: normalizeLogs(body?.logs).filter((item) => item.companyId === companyId),
    };
  } catch {
    return { ok: false, error: "暫時連不上公司資料，尚未停用。" };
  }
}

export async function insertCompanyRemote(input: {
  company: Company;
  bundle: CompanyBundle;
  logs: OperationLog[];
}): Promise<{ ok: true; companies: Company[] } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/office/registry/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = asRecord(await readJson(response));
    if (!response.ok) return { ok: false, error: typeof body?.error === "string" ? body.error : "暫時連不上公司資料。" };
    return { ok: true, companies: normalizeCompanies(body?.companies) };
  } catch {
    return { ok: false, error: "暫時連不上公司資料。" };
  }
}
