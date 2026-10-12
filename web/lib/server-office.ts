import fs from "node:fs";
import path from "node:path";
import {
  appendOperationLog,
  createCompany,
  createCompanyWithInitialCeo,
  defaultCompany,
  disableCompany,
  emptyBundle,
  seedUsers,
  type Company,
  type CompanyBundle,
  type OperationLog,
} from "./office.ts";
import { normalizeCompanies, normalizeCompanyBundle, normalizeLogs } from "./storage.ts";

type BundleSlot = {
  revision: number;
  bundle: CompanyBundle;
  logs: OperationLog[];
};

type FileState = {
  companies: Company[];
  bundles: Record<string, BundleSlot>;
};

export type BundleView = {
  revision: number;
  bundle: CompanyBundle;
  logs: OperationLog[];
};

type WriteInput = {
  companyId?: unknown;
  baseRevision?: unknown;
  bundle?: unknown;
  logs?: unknown;
  force?: unknown;
};

export type WriteResult =
  | { ok: true; revision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { ok: false; conflict: true; status: 409; revision: number; bundle: CompanyBundle; logs: OperationLog[] }
  | { ok: false; conflict?: false; status: number; error: string };

function seedState(): FileState {
  const company = defaultCompany();
  return {
    companies: [company],
    bundles: {
      [company.id]: {
        revision: 1,
        bundle: normalizeCompanyBundle(company.id, { ...emptyBundle(), users: seedUsers() }),
        logs: [],
      },
    },
  };
}

function normalizeState(value: unknown): FileState {
  const source = value && typeof value === "object" ? (value as { companies?: unknown; bundles?: unknown }) : {};
  const companies = normalizeCompanies(source.companies);
  const bundles: Record<string, BundleSlot> = {};
  const rawBundles = source.bundles && typeof source.bundles === "object" ? (source.bundles as Record<string, unknown>) : {};
  for (const company of companies) {
    const slot = rawBundles[company.id];
    const record = slot && typeof slot === "object" ? (slot as Partial<BundleSlot>) : {};
    const revision = typeof record.revision === "number" && record.revision >= 1 ? record.revision : 1;
    bundles[company.id] = {
      revision,
      bundle: normalizeCompanyBundle(company.id, record.bundle ?? emptyBundle()),
      logs: normalizeLogs(record.logs).filter((item) => item.companyId === company.id),
    };
  }
  if (companies.length === 0) return seedState();
  return { companies, bundles };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class OfficeServer {
  private chain: Promise<void> = Promise.resolve();
  private state: FileState;
  private file: string;

  constructor(file: string) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.state = this.readFile();
  }

  transaction<T>(fn: () => T): Promise<T> {
    const run = this.chain.then(() => fn());
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  registry(): Company[] {
    return clone(this.state.companies);
  }

  readBundle(companyId: string): BundleView | null {
    const slot = this.state.bundles[companyId];
    if (!slot || !this.state.companies.some((item) => item.id === companyId)) return null;
    return { revision: slot.revision, bundle: clone(slot.bundle), logs: clone(slot.logs) };
  }

  writeBundle(input: WriteInput): WriteResult {
    const companyId = typeof input.companyId === "string" ? input.companyId : "";
    const slot = this.state.bundles[companyId];
    if (!companyId || !slot || !this.state.companies.some((item) => item.id === companyId)) {
      return { ok: false, status: 404, error: "找不到此公司。" };
    }
    const baseRevision = typeof input.baseRevision === "number" ? input.baseRevision : Number.NaN;
    const force = input.force === true;
    if (!force && baseRevision !== slot.revision) {
      return {
        ok: false,
        conflict: true,
        status: 409,
        revision: slot.revision,
        bundle: clone(slot.bundle),
        logs: clone(slot.logs),
      };
    }
    slot.revision += 1;
    slot.bundle = normalizeCompanyBundle(companyId, input.bundle);
    slot.logs = normalizeLogs(input.logs).filter((item) => item.companyId === companyId);
    this.persist();
    return { ok: true, revision: slot.revision, bundle: clone(slot.bundle), logs: clone(slot.logs) };
  }

  createCompany(
    input: { name?: unknown; website?: unknown; ceoName?: unknown; account?: unknown; password?: unknown },
    now = new Date(),
  ): WriteResult & { companies?: Company[]; company?: Company } {
    const result = createCompanyWithInitialCeo(
      this.state.companies,
      {
        name: typeof input.name === "string" ? input.name : "",
        website: typeof input.website === "string" ? input.website : "",
        ceoName: typeof input.ceoName === "string" ? input.ceoName : "",
        account: typeof input.account === "string" ? input.account : "",
        password: typeof input.password === "string" ? input.password : "",
      },
      now,
    );
    if (!result.ok) return { ok: false, status: 400, error: result.error };
    const company = result.value.company;
    const bundle = normalizeCompanyBundle(company.id, { ...emptyBundle(), users: [result.value.user] });
    const logs = appendOperationLog([], { companyId: company.id, actor: "開發者後台", action: "建立公司與初始 CEO" }, now);
    this.state.companies = [...this.state.companies, company];
    this.state.bundles[company.id] = { revision: 1, bundle, logs };
    this.persist();
    return {
      ok: true,
      revision: 1,
      bundle: clone(bundle),
      logs: clone(logs),
      companies: this.registry(),
      company,
    };
  }

  disableNamedCompany(name: unknown, now = new Date()): WriteResult & { companies?: Company[]; companyId?: string } {
    const result = disableCompany(this.state.companies, typeof name === "string" ? name : "");
    if (!result.ok) return { ok: false, status: 400, error: result.error };
    this.state.companies = result.value;
    const company = result.value.find((item) => item.name === (typeof name === "string" ? name.trim() : ""));
    if (!company) return { ok: false, status: 400, error: "找不到此公司。" };
    const slot = this.state.bundles[company.id];
    const logs = appendOperationLog(slot?.logs ?? [], { companyId: company.id, actor: "開發者後台", action: "停用公司" }, now);
    if (slot) {
      slot.revision += 1;
      slot.logs = logs;
    }
    this.persist();
    return {
      ok: true,
      revision: slot?.revision ?? 1,
      bundle: clone(slot?.bundle ?? emptyBundle()),
      logs: clone(logs),
      companies: this.registry(),
      companyId: company.id,
    };
  }

  insertCompanyIfAbsent(company: unknown, bundle: unknown, logs: unknown): WriteResult & { companies?: Company[]; already?: boolean } {
    const next = normalizeCompanies([company])[0];
    if (!next) return { ok: false, status: 400, error: "公司資料不正確。" };
    const current = this.readBundle(next.id);
    if (current) {
      return { ok: true, already: true, revision: current.revision, bundle: current.bundle, logs: current.logs, companies: this.registry() };
    }
    const probe = createCompany(this.state.companies, { name: next.name, website: next.website }, new Date());
    if (!probe.ok) return { ok: false, status: 400, error: probe.error };
    const normalized = normalizeCompanyBundle(next.id, bundle);
    const nextLogs = normalizeLogs(logs).filter((item) => item.companyId === next.id);
    this.state.companies = [...this.state.companies, next];
    this.state.bundles[next.id] = { revision: 1, bundle: normalized, logs: nextLogs };
    this.persist();
    return { ok: true, revision: 1, bundle: clone(normalized), logs: clone(nextLogs), companies: this.registry() };
  }

  private readFile(): FileState {
    if (!fs.existsSync(this.file)) {
      const seeded = seedState();
      this.state = seeded;
      this.persist();
      return seeded;
    }
    const parsed: unknown = JSON.parse(fs.readFileSync(this.file, "utf8"));
    return normalizeState(parsed);
  }

  private persist(): void {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state));
    fs.renameSync(tmp, this.file);
  }
}

let singleton: OfficeServer | null = null;

export function createOfficeServer(dir: string): OfficeServer {
  return new OfficeServer(path.join(dir, "office.json"));
}

export function getOfficeServer(): OfficeServer {
  if (!singleton) {
    const dir = process.env.OFFICE_DATA_DIR || path.join(process.cwd(), "data");
    singleton = createOfficeServer(dir);
  }
  return singleton;
}
