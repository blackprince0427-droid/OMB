import assert from "node:assert/strict";
import test from "node:test";
import { emptyBundle, seedUsers, type CompanyBundle } from "./office.ts";
import {
  blobReadUrl,
  blobTokenConfigured,
  companyBundlePath,
  createMemoryBlobStore,
  createVercelBlobStore,
  describeBlobReadFailure,
  OFFICE_REGISTRY_PATH,
  officeErrorBody,
  OfficePersistenceError,
  parseBlobStoreId,
} from "./office-blob.ts";
import { createBlobOfficeServer } from "./server-office.ts";

function recordBundle(title: string): CompanyBundle {
  return {
    ...emptyBundle(),
    users: seedUsers(),
    records: [
      {
        id: title,
        account: "CEO",
        assignee: "CEO",
        title,
        content: "",
        workDate: "2026-10-12",
        done: false,
        tagId: "",
        taskNodeId: "",
        taskLevel: null,
        updatedAt: "2026-10-12 10:00",
      },
    ],
  };
}

test("沒有 Blob 設定時不把本機當成持久化失敗", () => {
  assert.equal(blobTokenConfigured({}), false);
  assert.equal(blobTokenConfigured({ BLOB_READ_WRITE_TOKEN: "   " }), false);
  assert.equal(blobTokenConfigured({ BLOB_READ_WRITE_TOKEN: "token" }), true);
});

test("新的實例讀到已寫入的公司檔與公司清單", async () => {
  const store = createMemoryBlobStore();
  const first = createBlobOfficeServer(store);
  const created = await first.transaction(() =>
    first.createCompany({
      name: "乙公司",
      website: "/acme",
      ceoName: "乙負責人",
      account: "boss",
      password: "secret-pass",
    }),
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const companyB = created.company?.id ?? "";
  const written = await first.transaction(() => {
    const current = first.readBundle("default");
    return first.writeBundle({
      companyId: "default",
      baseRevision: current?.revision,
      bundle: recordBundle("跨實例"),
      logs: [],
    });
  });
  assert.equal(written.ok, true);

  const second = createBlobOfficeServer(store);
  const view = await second.transaction(() => second.readBundle("default"));
  const registry = await second.transaction(() => second.registry());
  assert.equal(view?.bundle.records[0]?.title, "跨實例");
  assert.equal(registry.some((item) => item.id === "default"), true);
  assert.equal(registry.some((item) => item.id === companyB), true);
  const companyFile = await store.read(companyBundlePath("default"));
  const otherFile = await store.read(companyBundlePath(companyB));
  const registryFile = await store.read(OFFICE_REGISTRY_PATH);
  assert.equal(companyFile?.includes("跨實例"), true);
  assert.equal(companyFile?.includes("secret-pass"), false);
  assert.equal(otherFile?.includes("secret-pass"), true);
  assert.equal(otherFile?.includes("跨實例"), false);
  assert.equal(registryFile?.includes(companyB), true);
  assert.equal(registryFile?.includes("secret-pass"), false);
});

test("Blob 上版本不符仍回 409，強制覆寫才取代整包", async () => {
  const store = createMemoryBlobStore();
  const first = createBlobOfficeServer(store);
  await first.transaction(() => first.readBundle("default"));
  const second = createBlobOfficeServer(store);
  const stale = await second.transaction(() =>
    second.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("乙"), logs: [] }),
  );
  const current = await first.transaction(() => {
    const view = first.readBundle("default");
    return first.writeBundle({
      companyId: "default",
      baseRevision: view?.revision,
      bundle: recordBundle("甲"),
      logs: [],
    });
  });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  const conflict = await second.transaction(() =>
    second.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("丙"), logs: [] }),
  );
  assert.equal(conflict.ok, false);
  if (conflict.ok || !conflict.conflict) return;
  assert.equal(conflict.bundle.records[0]?.title, "甲");
  const forced = await second.transaction(() =>
    second.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("丙"), logs: [], force: true }),
  );
  assert.equal(forced.ok, true);
  const third = createBlobOfficeServer(store);
  const view = await third.transaction(() => third.readBundle("default"));
  assert.equal(view?.bundle.records[0]?.title, "丙");
  assert.equal(stale.ok, true);
});

test("store_ 前綴的權杖不會把讀取網址截成 store", async () => {
  assert.equal(parseBlobStoreId("vercel_blob_rw_store_exampleId_secret"), "exampleId");
  assert.equal(parseBlobStoreId("vercel_blob_rw_ce0rcu23vrrdzqap_secret"), "ce0rcu23vrrdzqap");
  const seen: { url?: string; wrote?: { pathname: string; access: string } } = {};
  const store = createVercelBlobStore({
    env: { BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_store_exampleId_secret" },
    readText: async (url) => {
      seen.url = url;
      return null;
    },
    writeText: async (pathname, _body, _token, access) => {
      seen.wrote = { pathname, access };
    },
  });
  assert.equal(await store.read("office/registry.json"), null);
  assert.equal(seen.url, blobReadUrl("exampleId", "private", "office/registry.json"));
  await store.write("office/registry.json", "{}");
  assert.deepEqual(seen.wrote, { pathname: "office/registry.json", access: "private" });
});

test("BLOB_STORE_ID 與 BLOB_ACCESS 覆寫讀取位置", async () => {
  let seen = "";
  const store = createVercelBlobStore({
    env: {
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_wrongId_secret",
      BLOB_STORE_ID: "store_overrideId",
      BLOB_ACCESS: "public",
    },
    readText: async (url) => {
      seen = url;
      return "{\"companies\":[]}";
    },
  });
  assert.equal(await store.read(OFFICE_REGISTRY_PATH), "{\"companies\":[]}");
  assert.equal(seen, "https://overrideId.public.blob.vercel-storage.com/office/registry.json");
});

test("Blob 失敗回 JSON 說明，不帶權杖、不空訊息", () => {
  const blocked = officeErrorBody(new OfficePersistenceError(describeBlobReadFailure(403, "Your store is blocked"), 503));
  assert.equal(blocked.status, 503);
  assert.match(blocked.error, /停用或超出用量/);
  assert.equal(blocked.error.includes("vercel_blob"), false);
  const leaked = officeErrorBody(new Error("failed vercel_blob_rw_store_exampleId_secret"));
  assert.equal(leaked.error.includes("vercel_blob_rw_store_exampleId_secret"), false);
  assert.equal(leaked.error.includes("[token]"), true);
  assert.ok(blocked.error.length > 0);
  assert.ok(leaked.error.length > 0);
  const opaque = officeErrorBody(new Error(""));
  assert.equal(opaque.status, 500);
  assert.equal(opaque.error, "公司資料暫時無法讀寫。");
});
