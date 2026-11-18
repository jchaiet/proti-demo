import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createPlan, formatStep, main, runPlan } from "./proti-verify.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const argsContain = (step, value) => step.args.includes(value);

test("all presets use existing pnpm scripts and never update snapshots or deploy", () => {
  const rootScripts = JSON.parse(
    fs.readFileSync(path.join(root, "package.json")),
  ).scripts;
  const webScripts = JSON.parse(
    fs.readFileSync(path.join(root, "web/package.json")),
  ).scripts;
  const studioScripts = JSON.parse(
    fs.readFileSync(path.join(root, "studio/package.json")),
  ).scripts;
  for (const preset of ["quick", "fixtures", "performance", "all"]) {
    for (const { args } of createPlan(preset)) {
      assert.ok(
        !args.some((arg) =>
          /--update-snapshots|deploy|proti:seed|proti:init/.test(arg),
        ),
      );
      if (args[0] === "--dir") {
        const scripts = args[1] === "web" ? webScripts : studioScripts;
        if (args[2] !== "exec")
          assert.ok(
            Object.hasOwn(scripts, args[2]),
            `${preset}: missing ${args[2]}`,
          );
      } else {
        assert.ok(
          Object.hasOwn(rootScripts, args[0]),
          `${preset}: missing ${args[0]}`,
        );
      }
    }
  }
});

test("quick is offline and does not turn on fixtures", () => {
  const plan = createPlan("quick");
  assert.equal(plan.length, 7);
  assert.ok(plan.every(({ env }) => !("PROTI_VISUAL_FIXTURES" in env)));
  assert.ok(plan.every(({ args }) => !argsContain({ args }, "build")));
});

test("fixture preset uses production build and only fixture-relevant Chromium tests", () => {
  const plan = createPlan("fixtures");
  assert.equal(plan.length, 2);
  assert.deepEqual(
    plan.map((step) => step.env.PROTI_VISUAL_FIXTURES),
    ["1", "1"],
  );
  assert.deepEqual(plan[0].args, ["--dir", "web", "build"]);
  assert.ok(plan[1].args.includes("e2e/a11y-fixtures.spec.ts"));
  assert.ok(plan[1].args.includes("e2e/grid-image-layout.spec.ts"));
  assert.ok(plan[1].args.includes("e2e/visual-navigation.spec.ts"));
  assert.ok(plan[1].args.includes("--project=chromium-desktop"));
  assert.ok(plan[1].args.includes("--project=chromium-mobile"));
  assert.ok(!plan[1].args.includes("e2e/visual.spec.ts"));
});

test("all builds fixtures once and follows them with visual and performance checks", () => {
  const plan = createPlan("all");
  assert.equal(plan.length, 10);
  assert.equal(plan.filter(({ args }) => args.at(-1) === "build").length, 1);
  assert.equal(plan.at(-1).env.PROTI_VISUAL_FIXTURES, "1");
  assert.equal(plan.at(-1).args.at(-1), "test:performance");
});

test("a failed command returns its status without running remaining steps", () => {
  const calls = [];
  const code = runPlan(createPlan("fixtures"), {
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: 9 };
    },
    log() {},
    error() {},
    environment: { MY_VAR: "kept" },
  });
  assert.equal(code, 9);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.env.MY_VAR, "kept");
  assert.equal(calls[0].options.env.PROTI_VISUAL_FIXTURES, "1");
});

test("the runner preserves parent environment and does not leak fixture flags", () => {
  const calls = [];
  const parent = { EXISTING: "present", PROTI_VISUAL_FIXTURES: "0" };
  const code = runPlan(createPlan("fixtures"), {
    spawn(command, args, options) {
      calls.push(options.env);
      return { status: 0 };
    },
    environment: parent,
    log() {},
    error() {},
  });
  assert.equal(code, 0);
  assert.deepEqual(parent, { EXISTING: "present", PROTI_VISUAL_FIXTURES: "0" });
  assert.ok(
    calls.every(
      (env) => env.EXISTING === "present" && env.PROTI_VISUAL_FIXTURES === "1",
    ),
  );
});

test("dry run and help do not execute commands", () => {
  const lines = [];
  assert.equal(
    main(["all", "--dry-run"], { log: (line) => lines.push(line), error() {} }),
    0,
  );
  assert.ok(lines.join("\n").includes("test:performance"));
  assert.ok(lines.join("\n").includes("PROTI_VISUAL_FIXTURES=1"));
  assert.equal(
    main(["--help"], { log: (line) => lines.push(line), error() {} }),
    0,
  );
  assert.ok(lines.join("\n").includes("verify:quick"));
});

test("invalid preset or flags fail with usage rather than running anything", () => {
  const errors = [];
  const io = { log() {}, error: (line) => errors.push(line) };
  assert.equal(main(["nonsense"], io), 2);
  assert.equal(main(["quick", "--update-snapshots"], io), 2);
  assert.ok(errors.join("\n").includes("Unknown verification preset"));
});

test("reporting command includes fixture flag only where necessary", () => {
  const [quick] = createPlan("quick");
  const [fixture] = createPlan("fixtures");
  assert.doesNotMatch(formatStep(quick), /PROTI_VISUAL_FIXTURES/);
  assert.match(formatStep(fixture), /^PROTI_VISUAL_FIXTURES=1 pnpm /);
});
