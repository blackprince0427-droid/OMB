import assert from "node:assert/strict";
import test from "node:test";
import { emptyBundle, seedUsers, type CompanyBundle } from "./office.ts";
import {
  blobTokenConfigured,
  companyBundlePath,
  createMemoryBlobStore,
  OFFICE_REGISTRY_PATH,
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
