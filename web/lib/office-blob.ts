import { put } from "@vercel/blob";

export const OFFICE_REGISTRY_PATH = "office/registry.json";

export type BlobAccess = "public" | "private";

export type BlobTextStore = {
  read(pathname: string): Promise<string | null>;
  write(pathname: string, body: string): Promise<void>;
};

export type OfficeSnapshot = {
  companies: unknown;
  bundles: Record<string, unknown>;
};

const GENERIC_OFFICE_ERROR = "公司資料暫時無法讀寫。";

export class OfficePersistenceError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = "OfficePersistenceError";
    this.status = status;
  }
}

export function companyBundlePath(companyId: string): string {
  return `office/companies/${encodeURIComponent(companyId)}.json`;
}

export function readBlobToken(env: Record<string, string | undefined> = process.env): string {
  const name = ["BLOB", "READ_WRITE_TOKEN"].join("_");
  const token = env[name];
  return typeof token === "string" ? token.trim() : "";
}

export function blobTokenConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return readBlobToken(env).length > 0;
}

export function sanitizeBlobMessage(value: string): string {
  return value.replace(/vercel_blob_[A-Za-z0-9_]+/g, "[token]").replace(/\s+/g, " ").trim().slice(0, 240);
}

export function bareBlobStoreId(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("store_") ? trimmed.slice("store_".length) : trimmed;
}

export function parseBlobStoreId(token: string): string {
  const parts = token.split("_");
  if (parts.length < 5 || parts[0] !== "vercel" || parts[1] !== "blob" || parts[2] !== "rw") return "";
  if (parts[3] === "store") return parts[4] ?? "";
  return parts[3] ?? "";
}

export function blobAccessFromEnv(env: Record<string, string | undefined> = process.env): BlobAccess {
  const name = ["BLOB", "ACCESS"].join("_");
  const raw = typeof env[name] === "string" ? env[name].trim().toLowerCase() : "";
  return raw === "public" ? "public" : "private";
}

export function resolveBlobStoreId(env: Record<string, string | undefined> = process.env): string {
  const explicitName = ["BLOB", "STORE_ID"].join("_");
  const explicit = typeof env[explicitName] === "string" ? bareBlobStoreId(env[explicitName]) : "";
  if (explicit) return explicit;
  return parseBlobStoreId(readBlobToken(env));
}

export function blobReadUrl(storeId: string, access: BlobAccess, pathname: string): string {
  if (!/^[A-Za-z0-9]+$/.test(storeId)) {
    throw new OfficePersistenceError("Blob store 識別碼不正確。請確認 BLOB_READ_WRITE_TOKEN 或 BLOB_STORE_ID。", 503);
  }
  const path = pathname.replace(/^\/+/, "");
  const url = `https://${storeId}.${access}.blob.vercel-storage.com/${path}`;
  return access === "private" ? `${url}?cache=0` : url;
}

export function describeBlobReadFailure(status: number, detail: string): string {
  const text = sanitizeBlobMessage(detail);
  if (/store id not found/i.test(text)) {
    return "Vercel Blob 找不到這個 store。請確認 BLOB_READ_WRITE_TOKEN 屬於已連接的 Blob store；若識別碼是 store_<id>，讀取網址要用底線後的 id。也可設定 BLOB_STORE_ID。";
  }
  if (status === 401 || status === 403 || /blocked|suspended|quota|access denied/i.test(text)) {
    return "Vercel Blob 拒絕讀寫。store 可能已停用或超出用量，或 BLOB_ACCESS 與 store 的 public／private 不一致（未設定時為 private）。請在 Vercel 恢復已連接的 Blob store 後再試。";
  }
  const suffix = text ? ` ${text}` : "";
  return `讀取 Vercel Blob 失敗（HTTP ${status}）。${suffix}`.trim();
}

export function describeBlobWriteFailure(error: unknown): string {
  const text = sanitizeBlobMessage(error instanceof Error ? error.message : "");
  if (/suspended|blocked|quota/i.test(text)) {
    return "Vercel Blob store 已停用或超出用量。請在 Vercel 恢復已連接的 Blob store 後再試。";
  }
  if (/access denied|valid token|private|public/i.test(text)) {
    return "Vercel Blob 拒絕寫入。請確認 BLOB_READ_WRITE_TOKEN 仍有效，且 BLOB_ACCESS 與 store 一致（未設定時為 private）。";
  }
  if (!text) return "寫入 Vercel Blob 失敗。";
  return `寫入 Vercel Blob 失敗。${text}`;
}

export function officeErrorBody(error: unknown): { status: number; error: string } {
  if (error instanceof OfficePersistenceError) {
    const message = sanitizeBlobMessage(error.message) || GENERIC_OFFICE_ERROR;
    return { status: error.status, error: message };
  }
  const safe = sanitizeBlobMessage(error instanceof Error ? error.message : "");
  if (!safe || safe === GENERIC_OFFICE_ERROR) return { status: 500, error: GENERIC_OFFICE_ERROR };
  if (/No token found|unable to extract store ID|Invalid token/i.test(safe)) {
    return { status: 503, error: "Vercel Blob 權杖無法使用。請設定 BLOB_READ_WRITE_TOKEN（形狀為 vercel_blob_rw_…）後重新部署。" };
  }
  return { status: 500, error: `${GENERIC_OFFICE_ERROR}${safe}` };
}

export function createMemoryBlobStore(): BlobTextStore {
  const files = new Map<string, string>();
  return {
    async read(pathname) {
      return files.get(pathname) ?? null;
    },
    async write(pathname, body) {
      files.set(pathname, body);
    },
  };
}

type VercelBlobStoreOptions = {
  env?: Record<string, string | undefined>;
  readText?: (url: string, token: string) => Promise<string | null>;
  writeText?: (pathname: string, body: string, token: string, access: BlobAccess) => Promise<void>;
};

function requireBlobTarget(env: Record<string, string | undefined>): { token: string; storeId: string; access: BlobAccess } {
  const token = readBlobToken(env);
  if (!token) {
    throw new OfficePersistenceError("尚未設定 BLOB_READ_WRITE_TOKEN。部署環境要持久化公司檔時，請在 Vercel 設定這個讀寫權杖。", 503);
  }
  const storeId = resolveBlobStoreId(env);
  if (!storeId) {
    throw new OfficePersistenceError("BLOB_READ_WRITE_TOKEN 無法對應 Blob store。權杖應為 vercel_blob_rw_…，或另外設定 BLOB_STORE_ID。", 503);
  }
  return { token, storeId, access: blobAccessFromEnv(env) };
}

async function readBlobText(url: string, token: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (error) {
    const detail = sanitizeBlobMessage(error instanceof Error ? error.message : "");
    throw new OfficePersistenceError(detail ? `無法連線 Vercel Blob。${detail}` : "無法連線 Vercel Blob。", 503);
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new OfficePersistenceError(describeBlobReadFailure(response.status, detail), 503);
  }
  return response.text();
}

async function writeBlobText(pathname: string, body: string, token: string, access: BlobAccess): Promise<void> {
  try {
    await put(pathname, body, {
      access,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      token,
    });
  } catch (error) {
    if (error instanceof OfficePersistenceError) throw error;
    throw new OfficePersistenceError(describeBlobWriteFailure(error), 503);
  }
}

export function createVercelBlobStore(options: VercelBlobStoreOptions = {}): BlobTextStore {
  const env = options.env ?? process.env;
  const readText = options.readText ?? readBlobText;
  const writeText = options.writeText ?? writeBlobText;
  return {
    async read(pathname) {
      const target = requireBlobTarget(env);
      return readText(blobReadUrl(target.storeId, target.access, pathname), target.token);
    },
    async write(pathname, body) {
      const target = requireBlobTarget(env);
      await writeText(pathname, body, target.token, target.access);
    },
  };
}

function parseSnapshotJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new OfficePersistenceError(`${label}不是有效的 JSON。`, 500);
  }
}

export async function readOfficeSnapshot(store: BlobTextStore): Promise<OfficeSnapshot | null> {
  const registryText = await store.read(OFFICE_REGISTRY_PATH);
  if (registryText === null) return null;
  const registry = parseSnapshotJson(registryText, "公司清單") as { companies?: unknown };
  const companies = Array.isArray(registry.companies) ? registry.companies : [];
  const bundles: Record<string, unknown> = {};
  for (const company of companies) {
    const id = company && typeof company === "object" && typeof (company as { id?: unknown }).id === "string" ? (company as { id: string }).id : "";
    if (!id) continue;
    const text = await store.read(companyBundlePath(id));
    if (text === null) continue;
    bundles[id] = parseSnapshotJson(text, "公司檔");
  }
  return { companies, bundles };
}

export async function writeOfficeSnapshot(
  store: BlobTextStore,
  state: { companies: { id: string }[]; bundles: Record<string, unknown> },
): Promise<void> {
  for (const company of state.companies) {
    const slot = state.bundles[company.id];
    if (!slot) continue;
    await store.write(companyBundlePath(company.id), JSON.stringify(slot));
  }
  await store.write(OFFICE_REGISTRY_PATH, JSON.stringify({ companies: state.companies }));
}
