import { get, put } from "@vercel/blob";

export const OFFICE_REGISTRY_PATH = "office/registry.json";

export type BlobTextStore = {
  read(pathname: string): Promise<string | null>;
  write(pathname: string, body: string): Promise<void>;
};

export type OfficeSnapshot = {
  companies: unknown;
  bundles: Record<string, unknown>;
};

export function companyBundlePath(companyId: string): string {
  return `office/companies/${encodeURIComponent(companyId)}.json`;
}

export function blobTokenConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const token = env.BLOB_READ_WRITE_TOKEN;
  return typeof token === "string" && token.trim().length > 0;
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

export function createVercelBlobStore(): BlobTextStore {
  return {
    async read(pathname) {
      const result = await get(pathname, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return new Response(result.stream).text();
    },
    async write(pathname, body) {
      await put(pathname, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    },
  };
}

export async function readOfficeSnapshot(store: BlobTextStore): Promise<OfficeSnapshot | null> {
  const registryText = await store.read(OFFICE_REGISTRY_PATH);
  if (registryText === null) return null;
  const registry = JSON.parse(registryText) as { companies?: unknown };
  const companies = Array.isArray(registry.companies) ? registry.companies : [];
  const bundles: Record<string, unknown> = {};
  for (const company of companies) {
    const id = company && typeof company === "object" && typeof (company as { id?: unknown }).id === "string" ? (company as { id: string }).id : "";
    if (!id) continue;
    const text = await store.read(companyBundlePath(id));
    if (text === null) continue;
    bundles[id] = JSON.parse(text) as unknown;
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
