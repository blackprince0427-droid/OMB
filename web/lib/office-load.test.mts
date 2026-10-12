import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { emptyOfficeCache } from "./office-cache.ts";
import { loadOfficeScreen, type OfficeClient } from "./office-load.ts";
import { emptyBundle, seedUsers, type Company, type CompanyBundle, type OperationLog } from "./office.ts";
import { createOfficeServer, type OfficeServer } from "./server-office.ts";

function clientFor(server: OfficeServer): OfficeClient {
  return {
    async registry() {
      return { ok: true, companies: server.registry() };
    },
    async bundle(companyId) {
      const found = server.readBundle(companyId);
      if (!found) return { ok: true, found: false };
      return { ok: true, found: true, ...found };
    },
    async put(input) {
      const result = server.writeBundle(input);
      if (result.ok) return { ok: true, revision: result.revision, bundle: result.bundle, logs: result.logs };
      if (result.conflict) return { ok: false, conflict: true, revision: result.revision, bundle: result.bundle, logs: result.logs };
      return { ok: false, offline: true, error: result.error };
    },
    async insert(input) {
      const result = server.insertCompanyIfAbsent(input.company, input.bundle, input.logs);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, companies: result.companies ?? [] };
    },
  };
}

function titled(title: string, base: CompanyBundle = { ...emptyBundle(), users: seedUsers() }): CompanyBundle {
  return {
    ...base,
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

test("裝置 A 寫入後，裝置 B 讀到同一份公司資料", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omb-load-"));
  try {
    const server = createOfficeServer(dir);
    const client = clientFor(server);
    const first = await loadOfficeScreen({
      path: "/",
      origin: "http://127.0.0.1:43123",
      cache: emptyOfficeCache(),
      legacy: null,
      legacyLogs: [],
      legacyEligible: false,
      client,
    });
    const saved = await client.put({
      companyId: "default",
      baseRevision: first.revision,
      bundle: titled("跨裝置驗收", first.bundle),
      logs: [],
    });
    assert.equal(saved.ok, true);
    const second = await loadOfficeScreen({
      path: "/records",
      origin: "http://127.0.0.1:43123",
      cache: emptyOfficeCache(),
      legacy: null,
      legacyLogs: [],
      legacyEligible: false,
      client,
    });
    assert.equal(second.bundle.records[0]?.title, "跨裝置驗收");
    assert.deepEqual(second.requestedCompanyIds, ["default"]);
    assert.equal(second.bundle.users.some((user) => user.account === "CEO"), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("後寫入的裝置在上傳前得到覆寫提示，取消則留下先寫入的內容", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omb-load-"));
  try {
    const server = createOfficeServer(dir);
    const client = clientFor(server);
    const origin = "http://127.0.0.1:43123";
    const deviceA = await loadOfficeScreen({
      path: "/",
      origin,
      cache: emptyOfficeCache(),
      legacy: null,
      legacyLogs: [],
      legacyEligible: false,
      client,
    });
    const uploaded = await client.put({
      companyId: "default",
      baseRevision: deviceA.revision,
      bundle: titled("先寫入", deviceA.bundle),
      logs: [],
    });
    assert.equal(uploaded.ok, true);
    const deviceB = await loadOfficeScreen({
      path: "/",
      origin,
      cache: {
        companies: deviceA.companies,
        entries: {
          default: { baseRevision: deviceA.revision, dirty: true, bundle: titled("後寫入", deviceA.bundle), logs: [] },
        },
      },
      legacy: null,
      legacyLogs: [],
      legacyEligible: false,
      client,
    });
    assert.equal(deviceB.conflict?.companyId, "default");
    assert.equal(deviceB.conflict?.localBundle.records[0]?.title, "後寫入");
    assert.equal(deviceB.conflict?.remote.bundle.records[0]?.title, "先寫入");
    assert.equal(server.readBundle("default")?.bundle.records[0]?.title, "先寫入");
    const kept = await loadOfficeScreen({
      path: "/",
      origin,
      cache: {
        companies: deviceA.companies,
        entries: {
          default: {
            baseRevision: deviceB.conflict?.remote.revision ?? 0,
            dirty: false,
            bundle: deviceB.conflict?.remote.bundle ?? deviceA.bundle,
            logs: [],
          },
        },
      },
      legacy: null,
      legacyLogs: [],
      legacyEligible: false,
      client,
    });
    assert.equal(kept.conflict, null);
    assert.equal(kept.bundle.records[0]?.title, "先寫入");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("確認覆寫後遠端變成後寫入的整包", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omb-load-"));
  try {
    const server = createOfficeServer(dir);
    const remote = server.readBundle("default");
    assert.ok(remote);
    const local = titled("後寫入");
    const rejected = server.writeBundle({ companyId: "default", baseRevision: remote.revision, bundle: titled("先寫入"), logs: [] });
    assert.equal(rejected.ok, true);
    const forced = server.writeBundle({ companyId: "default", baseRevision: remote.revision, bundle: local, logs: [], force: true });
    assert.equal(forced.ok, true);
    assert.equal(server.readBundle("default")?.bundle.records[0]?.title, "後寫入");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("舊本機資料在伺服器仍是種子時上傳一次", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omb-load-"));
  try {
    const server = createOfficeServer(dir);
    const legacyBundle = titled("遷移過來");
    const company: Company = server.registry()[0];
    const loaded = await loadOfficeScreen({
      path: "/",
      origin: "http://127.0.0.1:43123",
      cache: emptyOfficeCache(),
      legacy: { companies: [company], bundles: { default: legacyBundle } },
      legacyLogs: [] as OperationLog[],
      legacyEligible: true,
      client: clientFor(server),
    });
    assert.equal(loaded.conflict, null);
    assert.equal(server.readBundle("default")?.bundle.records[0]?.title, "遷移過來");
    assert.equal(loaded.bundle.records[0]?.title, "遷移過來");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
