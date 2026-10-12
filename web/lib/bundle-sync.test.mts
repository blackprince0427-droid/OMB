import assert from "node:assert/strict";
import test from "node:test";
import { emptyBundle, seedUsers, type CompanyBundle } from "./office.ts";
import { isUntouchedSeed, planCompanySync, type RemoteBundle } from "./bundle-sync.ts";

function seedRemote(): RemoteBundle {
  return {
    revision: 1,
    bundle: { ...emptyBundle(), users: seedUsers() },
    logs: [],
  };
}

function withTitle(bundle: CompanyBundle, title: string): CompanyBundle {
  return {
    ...bundle,
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

test("乾淨的舊緩存直接改用遠端", () => {
  const remote = seedRemote();
  remote.revision = 4;
  const plan = planCompanySync({
    cache: { baseRevision: 2, dirty: false, bundle: withTitle(remote.bundle, "舊"), logs: [] },
    remote,
    legacy: null,
    legacyEligible: false,
  });
  assert.equal(plan.action, "use-remote");
});

test("本機有未上傳變更且遠端未動時直接上傳", () => {
  const remote = seedRemote();
  const local = withTitle(remote.bundle, "本機");
  const plan = planCompanySync({
    cache: { baseRevision: 1, dirty: true, bundle: local, logs: [] },
    remote,
    legacy: null,
    legacyEligible: false,
  });
  assert.equal(plan.action, "upload");
  if (plan.action === "upload") assert.equal(plan.bundle.records[0]?.title, "本機");
});

test("本機有未上傳變更且遠端已更新時要提示", () => {
  const remote = { ...seedRemote(), revision: 3 };
  const plan = planCompanySync({
    cache: { baseRevision: 1, dirty: true, bundle: withTitle(remote.bundle, "本機"), logs: [] },
    remote,
    legacy: null,
    legacyEligible: false,
  });
  assert.equal(plan.action, "prompt");
});

test("伺服器仍是預設種子時，舊本機資料上傳一次", () => {
  const remote = seedRemote();
  assert.equal(isUntouchedSeed(remote), true);
  const legacy = withTitle(remote.bundle, "舊瀏覽器");
  const plan = planCompanySync({
    cache: null,
    remote,
    legacy: { bundle: legacy, logs: [] },
    legacyEligible: true,
  });
  assert.equal(plan.action, "upload");
  if (plan.action === "upload") assert.equal(plan.baseRevision, 1);
});

test("伺服器已有別的內容時，舊本機資料不可直接覆蓋", () => {
  const remote = { ...seedRemote(), revision: 2, bundle: withTitle(seedRemote().bundle, "已上傳") };
  const plan = planCompanySync({
    cache: null,
    remote,
    legacy: { bundle: withTitle(seedRemote().bundle, "另一台舊資料"), logs: [] },
    legacyEligible: true,
  });
  assert.equal(plan.action, "prompt");
});
