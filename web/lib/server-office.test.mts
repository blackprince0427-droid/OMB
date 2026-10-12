import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { emptyBundle, seedUsers, type CompanyBundle, type OperationLog } from "./office.ts";
import { createOfficeServer } from "./server-office.ts";

function tempServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omb-office-"));
  return { dir, server: createOfficeServer(dir) };
}

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

test("版本相符才寫入，不符回 409，強制覆寫才取代整包", () => {
  const { dir, server } = tempServer();
  try {
    const first = server.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("甲"), logs: [] });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.revision, 2);
    const stale = server.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("乙"), logs: [] });
    assert.equal(stale.ok, false);
    if (stale.ok || !stale.conflict) return;
    assert.equal(stale.bundle.records[0]?.title, "甲");
    const forced = server.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("乙"), logs: [], force: true });
    assert.equal(forced.ok, true);
    assert.equal(server.readBundle("default")?.bundle.records[0]?.title, "乙");
    assert.equal(server.readBundle("default")?.bundle.records.some((item) => item.title === "甲"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("公司 A 的讀寫不會帶出或改到公司 B", () => {
  const { dir, server } = tempServer();
  try {
    const created = server.createCompany({
      name: "乙公司",
      website: "/acme",
      ceoName: "乙負責人",
      account: "boss",
      password: "secret-pass",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const companyB = created.company?.id ?? "";
    const before = server.readBundle(companyB);
    const viewA = server.readBundle("default");
    assert.ok(viewA);
    assert.equal(JSON.stringify(viewA).includes("secret-pass"), false);
    assert.equal(JSON.stringify(viewA).includes("boss"), false);
    const foreignLog: OperationLog = { id: "x", companyId: companyB, actor: "外人", action: "不該寫進 A", at: "2026-10-12 11:00" };
    const wrote = server.writeBundle({
      companyId: "default",
      baseRevision: viewA?.revision,
      bundle: viewA?.bundle,
      logs: [foreignLog],
      force: true,
    });
    assert.equal(wrote.ok, true);
    if (!wrote.ok) return;
    assert.equal(wrote.logs.some((item) => item.companyId === companyB), false);
    const after = server.readBundle(companyB);
    assert.equal(after?.revision, before?.revision);
    assert.equal(after?.bundle.users[0]?.password, "secret-pass");
    assert.equal(server.readBundle("missing"), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("停用公司只改該公司，資料仍在", () => {
  const { dir, server } = tempServer();
  try {
    const written = server.writeBundle({ companyId: "default", baseRevision: 1, bundle: recordBundle("留下"), logs: [] });
    assert.equal(written.ok, true);
    const disabled = server.disableNamedCompany("預設公司");
    assert.equal(disabled.ok, true);
    assert.equal(server.registry().find((item) => item.id === "default")?.disabled, true);
    assert.equal(server.readBundle("default")?.bundle.records[0]?.title, "留下");
    assert.equal(server.readBundle("default")?.logs[0]?.action, "停用公司");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
