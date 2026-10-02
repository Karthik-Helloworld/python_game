const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const logic = require("../app/logic.js");
const levels = require("../app/levels.js");

function py(code) {
  const result = spawnSync("python3", ["-c", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function parsePython(code) {
  const result = spawnSync("python3", ["-c", "import ast,sys; ast.parse(sys.stdin.read())"], {
    input: code,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
}

test("question snippets match CPython and the marked answer", () => {
  for (const level of levels.levels) {
    assert.equal(py(level.module.code), level.module.output, level.id + " module");
    assert.equal(py(level.shrink.code), level.shrink.output, level.id + " shrink");
    parsePython(level.program);
    const seen = new Set();
    for (const kind of level.kinds) {
      const count = level.questions.filter((q) => q.kind === kind).length;
      assert.ok(count >= 2, level.id + " " + kind);
    }
    assert.equal(level.kinds.length, 3);
    for (const q of level.questions) {
      assert.ok(!seen.has(q.id), q.id);
      seen.add(q.id);
      assert.equal(py(q.code), q.prints, q.id);
      assert.ok(q.choices.includes(q.answer), q.id);
      assert.equal(new Set(q.choices).size, q.choices.length, q.id);
      const lines = q.prints.replace(/\n$/, "").split("\n");
      if (lines.length === 1) assert.equal(q.answer, lines[0], q.id);
    }
    const rows = levels.linesFor(level, { nameA: "Ava", nameB: "Bo" });
    const roles = rows.filter((row) => row.role);
    assert.equal(roles.length, level.boss ? 3 : 1, level.id);
    for (const row of roles) assert.ok(row.text.trim(), level.id + " empty role line");
  }
});

test("a check is three correct answers and a miss does not pass or score", () => {
  const order = ["variables"];
  let state = logic.emptyProgress(order);
  let level = state.levels.variables;
  let just = false;
  for (let i = 0; i < 3; i += 1) {
    const result = logic.answerQuestion(level, { id: "c" + i, answer: "yes" }, "yes");
    level = result.progress;
    just = result.checkJustPassed;
  }
  assert.equal(just, true);
  assert.equal(level.checkPassed, true);
  state = { points: 0, levels: { variables: level } };
  assert.equal(logic.canEnterGame(level), true);
  state = logic.awardCheck(state, "variables");
  assert.equal(state.points, 10);
  state = logic.awardCheck(state, "variables");
  assert.equal(state.points, 10);

  let missed = logic.blankLevel();
  const wrong = logic.answerQuestion(missed, { id: "w", answer: "yes" }, "no");
  assert.equal(wrong.correct, false);
  assert.equal(wrong.progress.checkPassed, false);
  const stuck = logic.awardCheck(
    { points: 0, levels: { variables: wrong.progress } },
    "variables"
  );
  assert.equal(stuck.points, 0);
  assert.equal(logic.canEnterGame(wrong.progress), false);
});

test("three misses shrink the example once and do not subtract points", () => {
  let level = logic.blankLevel();
  let shrinks = 0;
  for (const id of ["a", "b", "c"]) {
    const result = logic.answerQuestion(level, { id, answer: "1" }, "no");
    level = result.progress;
    if (result.shrinkNow) shrinks += 1;
  }
  assert.equal(shrinks, 1);
  assert.equal(level.misses, 0);
  assert.equal(level.shrunk, true);
  assert.equal(level.correctCount, 0);
  const again = logic.answerQuestion(level, { id: "d", answer: "1" }, "no");
  assert.equal(again.shrinkNow, false);
  assert.equal(again.progress.misses, 1);
});

test("clear points are 40, boss points are 50, and only after the check", () => {
  let state = logic.emptyProgress(["variables", "boss-a"]);
  state.levels.variables.checkPassed = true;
  state = logic.awardClear(state, "variables", false);
  assert.equal(state.points, 0);
  state = logic.markCleared(state, "variables");
  state = logic.awardClear(state, "variables", false);
  state = logic.awardClear(state, "variables", false);
  assert.equal(state.points, 40);

  state.levels["boss-a"].checkPassed = true;
  state = logic.markCleared(state, "boss-a");
  state = logic.awardCheck(state, "boss-a");
  state = logic.awardClear(state, "boss-a", true);
  assert.equal(state.points, 40 + 10 + 50);
});

test("levels unlock in order and the game stays locked before the check", () => {
  const order = levels.order;
  const state = logic.emptyProgress(order);
  assert.equal(logic.isUnlocked("variables", order, state), true);
  assert.equal(logic.isUnlocked("conditionals", order, state), false);
  assert.equal(logic.isUnlocked("boss-a", order, state), false);
  state.levels.variables.cleared = true;
  assert.equal(logic.isUnlocked("conditionals", order, state), true);
  assert.equal(logic.isUnlocked("loops", order, state), false);
  assert.equal(logic.canEnterGame(state.levels.conditionals), false);
});

test("pointing at the file requires every role line and no extras", () => {
  const lines = [
    { id: "L1", role: null },
    { id: "L2", role: "variable" },
    { id: "L3", role: "loop" },
    { id: "L4", role: "branch" },
  ];
  assert.equal(logic.selectionCorrect(["L2", "L3", "L4"], lines), true);
  assert.equal(logic.selectionCorrect(["L4", "L2", "L3"], lines), true);
  assert.equal(logic.selectionCorrect(["L2", "L3"], lines), false);
  assert.equal(logic.selectionCorrect(["L2", "L3", "L4", "L1"], lines), false);
  assert.equal(logic.selectionCorrect(["L1"], lines), false);
});

test("a used question is replaced by the next one of the same kind", () => {
  const bank = [
    { id: "a", kind: "value" },
    { id: "b", kind: "value" },
    { id: "c", kind: "print" },
  ];
  assert.equal(logic.pickQuestion(bank, [], "value").id, "a");
  assert.equal(logic.pickQuestion(bank, ["a"], "value").id, "b");
  assert.equal(logic.pickQuestion(bank, ["a", "b"], "value").id, "a");
  assert.equal(logic.pickQuestion(bank, [], "print").id, "c");
});

test("mark cleared and game won do nothing before the check", () => {
  let state = logic.emptyProgress(["variables"]);
  state = logic.markCleared(state, "variables");
  state = logic.markGameWon(state, "variables");
  assert.equal(state.levels.variables.cleared, false);
  assert.equal(state.levels.variables.gameWon, false);
});
