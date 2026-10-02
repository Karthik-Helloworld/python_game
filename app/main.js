(function () {
  const logic = window.CampaignLogic;
  const content = window.CampaignLevels;
  const STORAGE_KEY = "python-campaign-v1";
  const KEY_STORAGE = "python-campaign-haiku-key";

  const ui = {
    screen: "map",
    levelId: null,
    step: "module",
    question: null,
    moduleRan: false,
    shrinkRan: false,
    feedback: "",
    feedbackTone: "",
    selected: [],
    game: null,
    note: "",
    draft: "",
    flawDraft: "",
    scoreDraft: "",
    production: "",
    busy: false,
    report: "",
  };

  let progress = load();

  const app = document.getElementById("app");
  app.addEventListener("click", onClick);
  app.addEventListener("input", onInput);
  document.addEventListener("keydown", onKey);

  render();

  function load() {
    const base = logic.emptyProgress(content.allIds);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      base.points = Number(saved.points) || 0;
      for (const id of content.allIds) {
        if (saved.levels && saved.levels[id]) {
          base.levels[id] = { ...base.levels[id], ...saved.levels[id] };
          if (!Array.isArray(base.levels[id].usedQuestionIds)) {
            base.levels[id].usedQuestionIds = [];
          }
        }
      }
      return base;
    } catch (error) {
      return base;
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function onClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (action === "show-map") showMap();
    else if (action === "open-level") openLevel(target.dataset.level);
    else if (action === "open-act") openAct(target.dataset.act);
    else if (action === "reset") reset();
    else if (action === "step") goStep(target.dataset.step);
    else if (action === "run-module") runModule();
    else if (action === "run-shrink") runShrink();
    else if (action === "to-check") toCheck();
    else if (action === "answer") answer(Number(target.dataset.index));
    else if (action === "enter-game") enterGame();
    else if (action === "guess") guess();
    else if (action === "score") scorePoint(target.dataset.who);
    else if (action === "shop") shop(target.dataset.choice);
    else if (action === "roll") roll();
    else if (action === "toggle-line") toggleLine(target.dataset.line);
    else if (action === "confirm-lines") confirmLines();
    else if (action === "save-key") saveKey();
    else if (action === "clear-key") clearKey();
    else if (action === "judge-writing") judgeWriting();
    else if (action === "set-production") setProduction(target.dataset.value);
    else if (action === "check-score") checkScore();
    else if (action === "judge-flaws") judgeFlaws();
  }

  function onInput(event) {
    if (event.target.id === "student-code") ui.draft = event.target.value;
    if (event.target.id === "flaw-text") ui.flawDraft = event.target.value;
    if (event.target.id === "review-score") ui.scoreDraft = event.target.value;
  }

  function onKey(event) {
    if (ui.screen !== "level") return;
    if (ui.step === "check") {
      const n = Number(event.key);
      if (n >= 1 && n <= 4) answer(n - 1);
    }
    if (event.key === "Enter" && ui.step === "game" && ui.game && ui.game.type === "highlow") {
      event.preventDefault();
      guess();
    }
  }

  function showMap() {
    ui.screen = "map";
    ui.feedback = "";
    render();
  }

  function openAct(id) {
    const act = content.acts.find((item) => item.id === id);
    ui.screen = "note";
    ui.note = act.blurb + " Act I is the path you can play.";
    render();
  }

  function reset() {
    if (!window.confirm("Clear all Python points and start over?")) return;
    progress = logic.emptyProgress(content.allIds);
    save();
    showMap();
  }

  function openLevel(id) {
    const level = content.byId[id];
    if (!level) return;
    if (!level.alwaysOpen && !logic.isUnlocked(id, content.order, progress)) return;
    const state = progress.levels[id];
    ui.screen = "level";
    ui.levelId = id;
    ui.feedback = "";
    ui.feedbackTone = "";
    ui.selected = [];
    ui.report = "";
    ui.moduleRan = Boolean(state.checkPassed || state.correctCount > 0 || state.usedQuestionIds.length);
    ui.shrinkRan = false;
    if (level.mode === "write") {
      ui.draft = state.draft || level.starter;
      ui.step = state.cleared ? "cleared" : "write";
      render();
      return;
    }
    if (level.mode === "judge") {
      ui.flawDraft = state.flawDraft || "";
      ui.production = "";
      ui.scoreDraft = "";
      ui.step = state.cleared ? "cleared" : state.checkPassed ? "flaws" : "review";
      render();
      return;
    }
    if (state.cleared) ui.step = "cleared";
    else if (state.gameWon) ui.step = "point";
    else if (state.checkPassed) {
      ui.step = "game";
      ui.game = freshGame(level);
    } else if (state.correctCount > 0 || state.usedQuestionIds.length) {
      ui.step = "check";
      ui.question = currentQuestion(level, state);
    } else ui.step = "module";
    render();
  }

  function goStep(step) {
    const state = currentState();
    if (step === "game" && !logic.canEnterGame(state)) return;
    if (step === "check" && !ui.moduleRan && state.correctCount === 0) return;
    if (step === "point" || step === "cleared" || step === "gate" || step === "shrink") return;
    if (step === "game" && state.gameWon && !state.cleared) {
      ui.step = "point";
      ui.feedback = "";
      render();
      return;
    }
    ui.step = step;
    ui.feedback = "";
    if (step === "check") ui.question = currentQuestion(currentLevel(), state);
    if (step === "game" && (!ui.game || ui.game.done)) ui.game = freshGame(currentLevel());
    render();
  }

  function currentLevel() {
    return content.byId[ui.levelId];
  }

  function currentState() {
    return progress.levels[ui.levelId];
  }

  function currentQuestion(level, state) {
    const kind = level.kinds[state.correctCount];
    if (!kind) return null;
    return logic.pickQuestion(level.questions, state.usedQuestionIds, kind);
  }

  function runModule() {
    ui.moduleRan = true;
    ui.feedback = "";
    render();
  }

  function runShrink() {
    ui.shrinkRan = true;
    render();
  }

  function toCheck() {
    if (ui.step === "shrink" && !ui.shrinkRan) return;
    if (ui.step === "module" && !ui.moduleRan) return;
    ui.step = "check";
    ui.feedback = "";
    ui.question = currentQuestion(currentLevel(), currentState());
    render();
  }

  function answer(index) {
    if (ui.step !== "check" || !ui.question) return;
    const choice = ui.question.choices[index];
    if (choice === undefined) return;
    const level = currentLevel();
    const result = logic.answerQuestion(currentState(), ui.question, choice);
    progress = {
      points: progress.points,
      levels: { ...progress.levels, [level.id]: result.progress },
    };
    if (result.shrinkNow) {
      ui.step = "shrink";
      ui.shrinkRan = false;
      ui.feedback = "";
    } else if (result.checkJustPassed) {
      progress = logic.awardCheck(progress, level.id);
      ui.step = "gate";
      ui.feedback = "";
      ui.question = null;
    } else if (result.correct) {
      ui.question = currentQuestion(level, result.progress);
      ui.feedback = "Correct.";
      ui.feedbackTone = "good";
    } else {
      ui.question = currentQuestion(level, result.progress);
      ui.feedback = "Not that. No points lost. Another question.";
      ui.feedbackTone = "bad";
    }
    save();
    render();
  }

  function enterGame() {
    ui.step = "game";
    ui.game = freshGame(currentLevel());
    ui.feedback = "";
    render();
  }

  function freshGame(level) {
    if (level.game === "highlow") {
      return { type: "highlow", secret: 1 + Math.floor(Math.random() * 10), log: [], done: false };
    }
    if (level.game === "scores") {
      return { type: "scores", nameA: "Ava", nameB: "Bo", scoreA: 0, scoreB: 0, log: [], done: false, started: false };
    }
    if (level.game === "shop") {
      return { type: "shop", gold: 8, price: 3, owned: false, log: [], done: false };
    }
    return { type: "dice", p1: 0, p2: 0, turn: 1, log: [], done: false, winner: "" };
  }

  function finishGame() {
    ui.game.done = true;
    progress = logic.markGameWon(progress, ui.levelId);
    save();
    ui.step = "point";
    ui.selected = [];
    ui.feedback = currentLevel().winText;
    ui.feedbackTone = "good";
    render();
  }

  function guess() {
    if (!ui.game || ui.game.type !== "highlow" || ui.game.done) return;
    const field = document.getElementById("guess");
    const value = Number(field && field.value);
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      ui.game.log = ui.game.log.concat("Enter a number from 1 to 10.");
      ui.feedback = "";
      render();
      return;
    }
    const secret = ui.game.secret;
    let line = "You guessed " + value + ". ";
    if (value < secret) line += "higher";
    else if (value > secret) line += "lower";
    else line += "you got it";
    ui.game.log = ui.game.log.concat(line);
    if (value === secret) finishGame();
    else render();
  }

  function readNames() {
    const a = document.getElementById("name-a");
    const b = document.getElementById("name-b");
    if (a && a.value.trim()) ui.game.nameA = a.value.trim().slice(0, 16);
    if (b && b.value.trim()) ui.game.nameB = b.value.trim().slice(0, 16);
  }

  function scorePoint(who) {
    if (!ui.game || ui.game.done) return;
    readNames();
    ui.game.started = true;
    if (who === "a") ui.game.scoreA += 1;
    else ui.game.scoreB += 1;
    ui.game.log = ui.game.log.concat(aheadText());
    if (ui.game.scoreA >= 5 || ui.game.scoreB >= 5) finishGame();
    else render();
  }

  function aheadText() {
    const game = ui.game;
    if (game.scoreA > game.scoreB) return game.nameA + " is ahead";
    if (game.scoreB > game.scoreA) return game.nameB + " is ahead";
    return "tied";
  }

  function shop(choice) {
    if (!ui.game || ui.game.done) return;
    if (choice === "buy") {
      if (ui.game.gold >= ui.game.price) {
        ui.game.gold -= ui.game.price;
        ui.game.owned = true;
        ui.game.log = ui.game.log.concat("bought. gold is " + ui.game.gold);
      } else {
        ui.game.log = ui.game.log.concat("not enough");
      }
      render();
      return;
    }
    if (ui.game.owned) {
      ui.game.log = ui.game.log.concat("leave");
      finishGame();
      return;
    }
    ui.game.log = ui.game.log.concat("You left without the map. The loop is still open.");
    render();
  }

  function roll() {
    if (!ui.game || ui.game.done) return;
    if (ui.game.p1 >= 20 || ui.game.p2 >= 20) return;
    const rollValue = 1 + Math.floor(Math.random() * 6);
    if (ui.game.turn === 1) {
      ui.game.p1 += rollValue;
      ui.game.turn = 2;
      ui.game.log = ui.game.log.concat("p1 rolls " + rollValue + ". p1 has " + ui.game.p1 + ".");
    } else {
      ui.game.p2 += rollValue;
      ui.game.turn = 1;
      ui.game.log = ui.game.log.concat("p2 rolls " + rollValue + ". p2 has " + ui.game.p2 + ".");
    }
    if (ui.game.p1 >= 20 || ui.game.p2 >= 20) {
      ui.game.winner = ui.game.p1 >= 20 ? "p1 wins" : "p2 wins";
      ui.game.log = ui.game.log.concat(ui.game.winner);
      finishGame();
      return;
    }
    render();
  }

  function toggleLine(id) {
    const lines = pointLines();
    const need = lines.filter((line) => line.role).length;
    if (need === 1) {
      ui.selected = [id];
    } else if (ui.selected.includes(id)) {
      ui.selected = ui.selected.filter((item) => item !== id);
    } else if (ui.selected.length < need) {
      ui.selected = ui.selected.concat(id);
    }
    ui.feedback = "";
    render();
  }

  function confirmLines() {
    const level = currentLevel();
    const lines = pointLines();
    const need = lines.filter((line) => line.role).length;
    if (ui.selected.length !== need) return;
    if (!logic.selectionCorrect(ui.selected, lines)) {
      ui.feedback = level.pointHint || "Not those lines.";
      ui.feedbackTone = "bad";
      ui.selected = [];
      render();
      return;
    }
    progress = logic.markCleared(progress, level.id);
    progress = logic.awardClear(progress, level.id, level.boss);
    save();
    ui.step = "cleared";
    ui.feedback = "";
    render();
  }

  function pointLines() {
    const level = currentLevel();
    const names = ui.game || { nameA: "Ava", nameB: "Bo" };
    return content.linesFor(level, names);
  }

  function render() {
    app.innerHTML = '<div class="board">' + header() + body() + "</div>";
    const guess = document.getElementById("guess");
    if (guess) guess.focus();
  }

  function header() {
    return (
      '<header class="hud"><div class="mark"><div><p class="eyebrow">Python Campaign</p><h1>Karthik</h1></div></div>' +
      '<div class="points" data-testid="points"><b>' +
      progress.points +
      '</b><span>Python points</span></div></header>'
    );
  }

  function body() {
    if (ui.screen === "note") {
      return (
        '<main class="panel"><p>' +
        esc(ui.note) +
        '</p><button class="primary" data-action="show-map">Back to campaign</button></main>'
      );
    }
    if (ui.screen === "level") return renderLevel();
    return renderMap();
  }

  function levelStatus(level, state, open) {
    const total = logic.CHECK_POINTS + (level.boss ? logic.BOSS_POINTS : logic.LEVEL_POINTS);
    if (!open) return "Locked";
    if (state.cleared) return "Cleared";
    if (state.gameWon) return "Point at the file";
    if (state.checkPassed) return level.mode === "write" ? "Tests passed" : level.mode === "judge" ? "Judge zone" : "Game open";
    if (state.correctCount > 0) return "Check " + state.correctCount + "/3";
    return total + " points";
  }

  function nextUp() {
    for (const id of content.order) {
      if (logic.isUnlocked(id, content.order, progress) && !progress.levels[id].cleared) return content.byId[id];
    }
    for (const level of content.practice) {
      if (!progress.levels[level.id].cleared) return level;
    }
    return null;
  }

  function rowFor(level, index, open) {
    const state = progress.levels[level.id];
    return (
      '<li><button class="level-card' +
      (state.cleared ? " cleared" : "") +
      (level.boss ? " boss" : "") +
      '" data-testid="level-' +
      level.id +
      '" data-action="open-level" data-level="' +
      level.id +
      '"' +
      (open ? "" : " disabled") +
      '><span class="index">' +
      (index + 1) +
      '</span><span class="card-title">' +
      esc(level.title) +
      '</span><span class="status">' +
      levelStatus(level, state, open) +
      "</span></button></li>"
    );
  }

  function renderMap() {
    const featured = nextUp();
    const intro = {
      variables: "Six lines. Three questions. Then you guess a number.",
      conditionals: "See who is ahead. Then play first to five.",
      loops: "Buy the map, then leave.",
      "boss-a": "Roll to 20. Then find the lines yourself.",
      "write-ahead": "Write one small function. Tests check it.",
      "judge-save": "Score a file, then name what would break.",
    };
    const featuredHtml = featured
      ? '<button class="now" data-testid="level-' +
        featured.id +
        '" data-action="open-level" data-level="' +
        featured.id +
        '"><p class="kicker">Start here</p><h2>' +
        esc(featured.title) +
        '</h2><p class="tutor">' +
        esc(intro[featured.id] || "One short step.") +
        '</p><span class="primary">Begin</span></button>'
      : '<p class="hello">You finished what is open.</p>';
    const rows = content.order
      .map((id, index) => {
        if (featured && id === featured.id) return "";
        return rowFor(content.byId[id], index, logic.isUnlocked(id, content.order, progress));
      })
      .join("");
    const practiceRows = content.practice
      .map((level, index) => {
        if (featured && level.id === featured.id) return "";
        return rowFor(level, index, true);
      })
      .join("");
    const later = content.acts
      .filter((act) => act.id !== "I")
      .map(
        (act) =>
          '<button class="later-card" data-action="open-act" data-act="' +
          act.id +
          '">' +
          esc(act.title) +
          "</button>"
      )
      .join("");
    return (
      '<main data-testid="map"><p class="hello">One idea. Then a short game. Stop when it feels like homework.</p>' +
      featuredHtml +
      '<section class="act"><h2>The path</h2><ol class="path">' +
      rows +
      practiceRows +
      '</ol></section><details class="fold"><summary>Haiku, if you want it</summary>' +
      haikuPanel() +
      '</details><details class="fold"><summary>Later acts</summary><div class="later-grid">' +
      later +
      '</div></details><button class="text-btn reset" data-action="reset">Reset progress</button></main>'
    );
  }

  function renderLevel() {
    const level = currentLevel();
    const state = currentState();
    return (
      '<main><div class="level-top"><button class="back" data-action="show-map">Campaign</button><h2>' +
      esc(level.title) +
      "</h2></div>" +
      steps(level, state) +
      '<p class="feedback ' +
      ui.feedbackTone +
      '" data-testid="feedback">' +
      esc(ui.feedback) +
      "</p>" +
      stepBody(level, state) +
      "</main>"
    );
  }

  function steps(level, state) {
    if (level.mode === "write") {
      return stepButtons([["write", "Write"]], "write", false);
    }
    if (level.mode === "judge") {
      const current = ui.step === "flaws" || ui.step === "cleared" ? "flaws" : "review";
      return stepButtons(
        [
          ["review", "Score"],
          ["flaws", "Flaws"],
        ],
        current,
        !state.checkPassed
      );
    }
    const gameOpen = logic.canEnterGame(state);
    const items = [
      ["module", "Module"],
      ["check", "Check"],
      ["game", "Game"],
    ];
    return (
      '<ol class="steps">' +
      items
        .map(([id, label]) => {
          const current = ui.step === id || (id === "game" && (ui.step === "point" || ui.step === "cleared" || ui.step === "gate"));
          const disabled = (id === "game" && !gameOpen) || (id === "check" && !ui.moduleRan && state.correctCount === 0);
          return (
            '<li><button data-action="step" data-step="' +
            id +
            '" data-testid="step-' +
            id +
            '"' +
            (current ? ' aria-current="step"' : "") +
            (disabled ? " disabled" : "") +
            ">" +
            label +
            "</button></li>"
          );
        })
        .join("") +
      "</ol>"
    );
  }

  function stepButtons(items, current, flawsLocked) {
    return (
      '<ol class="steps">' +
      items
        .map(([id, label]) => {
          const disabled = id === "flaws" && flawsLocked;
          return (
            '<li><button type="button" data-testid="step-' +
            id +
            '"' +
            (id === current ? ' aria-current="step"' : "") +
            (disabled ? " disabled" : "") +
            ">" +
            label +
            "</button></li>"
          );
        })
        .join("") +
      "</ol>"
    );
  }

  function stepBody(level, state) {
    if (level.mode === "write") return ui.step === "cleared" ? renderCleared(level) : renderWrite(level);
    if (level.mode === "judge") {
      if (ui.step === "cleared") return renderCleared(level);
      if (ui.step === "flaws") return renderFlaws(level);
      return renderReview(level);
    }
    if (ui.step === "shrink") return renderShrink(level);
    if (ui.step === "check") return renderCheck(level, state);
    if (ui.step === "gate") return renderGate(level);
    if (ui.step === "game") return renderGame(level);
    if (ui.step === "point") return renderPoint(level);
    if (ui.step === "cleared") return renderCleared(level);
    return renderModule(level);
  }

  function renderModule(level) {
    const output = ui.moduleRan ? level.module.output.replace(/\n$/, "") : "Not run yet.";
    return (
      '<section class="split"><div class="panel"><p class="concept">' +
      esc(level.concept) +
      '</p><p class="tutor">Run the file. The check stays shut until it has run.</p><div class="actions"><button class="primary" data-action="run-module" data-testid="run-module">Run this file</button><button class="primary" data-action="to-check" data-testid="to-check"' +
      (ui.moduleRan ? "" : " disabled") +
      '>Go to the check</button></div></div><div>' +
      codeBlock(level.module.code) +
      '<pre class="output" data-testid="module-output">' +
      esc(output) +
      "</pre></div></section>"
    );
  }

  function renderShrink(level) {
    const output = ui.shrinkRan ? level.shrink.output.replace(/\n$/, "") : "Not run yet.";
    return (
      '<section class="split"><div class="panel"><p class="concept">' +
      esc(level.shrink.note) +
      '</p><div class="actions"><button class="primary" data-action="run-shrink" data-testid="run-shrink">Run the short file</button><button class="primary" data-action="to-check"' +
      (ui.shrinkRan ? "" : " disabled") +
      ">Back to the check</button></div></div><div>" +
      codeBlock(level.shrink.code) +
      '<pre class="output">' +
      esc(output) +
      "</pre></div></section>"
    );
  }

  function renderCheck(level, state) {
    const question = ui.question;
    if (!question) return '<section class="panel"><p>No question left.</p></section>';
    const choices = question.choices
      .map(
        (choice, index) =>
          '<button class="choice" data-action="answer" data-index="' +
          index +
          '" data-testid="choice">' +
          esc(choice) +
          "</button>"
      )
      .join("");
    return (
      '<section class="split"><div class="panel"><p class="kicker">Question ' +
      (state.correctCount + 1) +
      ' of 3</p><p class="concept">' +
      esc(question.prompt) +
      '</p><div class="choices">' +
      choices +
      '</div></div><div>' +
      codeBlock(question.code) +
      "</div></section>"
    );
  }

  function renderGate(level) {
    return (
      '<section class="panel" data-testid="gate"><p class="concept">Check passed. +' +
      logic.CHECK_POINTS +
      ' Python points.</p><p class="tutor">The ' +
      esc(level.title) +
      ' game is unlocked.</p><button class="primary" data-action="enter-game" data-testid="enter-game">Enter the game</button></section>'
    );
  }

  function renderGame(level) {
    return '<section class="split"><div class="panel" data-testid="game-panel">' + gamePanel(level) + "</div><div>" + renderStaticCode(level, false) + "</div></section>";
  }

  function gamePanel(level) {
    const game = ui.game;
    let controls = "";
    if (game.type === "highlow") {
      controls =
        '<label class="kicker" for="guess">Guess 1 to 10</label><div class="controls"><input id="guess" data-testid="guess-input" type="number" min="1" max="10" inputmode="numeric"><button class="primary" data-action="guess" data-testid="guess-submit">Guess</button></div>';
    } else if (game.type === "scores") {
      controls =
        '<div class="name-row"><input id="name-a" data-testid="name-a" type="text" maxlength="16" value="' +
        esc(game.nameA) +
        '"' +
        (game.started ? " disabled" : "") +
        '><input id="name-b" data-testid="name-b" type="text" maxlength="16" value="' +
        esc(game.nameB) +
        '"' +
        (game.started ? " disabled" : "") +
        '></div><div class="play-stats"><div><span>Ahead</span><strong>' +
        esc(aheadText()) +
        '</strong></div><div><span>' +
        esc(game.nameA) +
        "</span><strong>" +
        game.scoreA +
        "</strong></div><div><span>" +
        esc(game.nameB) +
        "</span><strong>" +
        game.scoreB +
        '</strong></div></div><div class="controls"><button class="primary" data-action="score" data-who="a" data-testid="score-a">+1 ' +
        esc(game.nameA) +
        '</button><button class="primary" data-action="score" data-who="b" data-testid="score-b">+1 ' +
        esc(game.nameB) +
        "</button></div>";
    } else if (game.type === "shop") {
      controls =
        '<div class="play-stats"><div><span>Gold</span><strong data-testid="gold">' +
        game.gold +
        '</strong></div><div><span>Map</span><strong>' +
        (game.owned ? "owned" : "3") +
        '</strong></div></div><div class="controls"><button class="primary" data-action="shop" data-choice="buy" data-testid="buy">Buy map</button><button class="primary" data-action="shop" data-choice="leave" data-testid="leave">Leave</button></div>';
    } else {
      controls =
        '<div class="play-stats"><div><span>p1</span><strong data-testid="p1">' +
        game.p1 +
        '</strong></div><div><span>p2</span><strong data-testid="p2">' +
        game.p2 +
        '</strong></div><div><span>Turn</span><strong>' +
        (game.turn === 1 ? "p1" : "p2") +
        '</strong></div></div><div class="controls"><button class="primary" data-action="roll" data-testid="roll">Roll</button></div>';
    }
    return '<p class="tutor">' + esc(level.tutor) + "</p>" + controls + "<ol class=\"log\">" + game.log.map((line) => "<li>" + esc(line) + "</li>").join("") + "</ol>";
  }

  function renderPoint(level) {
    const lines = pointLines();
    const need = lines.filter((line) => line.role).length;
    return (
      '<section class="panel" data-testid="point"><p class="concept">' +
      esc(level.pointPrompt) +
      '</p><p class="tutor">Selected ' +
      ui.selected.length +
      " of " +
      need +
      ".</p>" +
      renderLines(lines, true) +
      '<div class="actions"><button class="primary" data-action="confirm-lines" data-testid="confirm-lines"' +
      (ui.selected.length === need ? "" : " disabled") +
      ">Check these lines</button></div></section>"
    );
  }

  function renderCleared(level) {
    const gain = level.boss ? logic.BOSS_POINTS : logic.LEVEL_POINTS;
    const awardLine = level.mode === "write"
      ? "Level cleared. +10 for the tests and +40 for the writing."
      : "Level cleared. +" + gain + " Python points.";
    let nextId = null;
    if (level.next) nextId = level.next;
    else if (!level.mode) {
      const index = content.order.indexOf(level.id);
      nextId = index >= 0 ? content.order[index + 1] : null;
    }
    const next = nextId ? content.byId[nextId] : null;
    const doneNote = level.mode
      ? "Your points stay saved."
      : "Act I is finished. Later acts are not in this build. Your points stay saved.";
    const nextButton = next
      ? '<button class="primary" data-action="open-level" data-level="' + next.id + '" data-testid="next-level">' + esc(next.title) + "</button>"
      : '<p class="tutor">' + doneNote + "</p>";
    return (
      '<section class="panel" data-testid="cleared"><p class="concept">' +
      awardLine +
      '</p><p>You have ' +
      progress.points +
      ".</p>" +
      (ui.report ? '<p class="tutor" data-testid="judge-report">' + esc(ui.report) + "</p>" : "") +
      nextButton +
      '<button class="text-btn" data-action="show-map">Back to campaign</button></section>'
    );
  }

  function renderStaticCode(level) {
    return renderLines(pointLines(), false);
  }

  function renderLines(lines, selectable) {
    return (
      '<div class="code-list">' +
      lines
        .map((line) => {
          const body = '<span class="ln">' + line.id.slice(1) + '</span><span>' + highlight(line.text || " ") + "</span>";
          if (!selectable || !line.text.trim()) return '<div class="line-static">' + body + "</div>";
          const selected = ui.selected.includes(line.id) ? " selected" : "";
          return (
            '<button class="line-btn' +
            selected +
            '" data-action="toggle-line" data-line="' +
            line.id +
            '" data-testid="code-line">' +
            body +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function codeBlock(code) {
    const lines = code.replace(/\n$/, "").split("\n");
    return (
      '<pre>' +
      lines.map((line) => highlight(line)).join("\n") +
      "</pre>"
    );
  }

  function highlight(text) {
    const escaped = esc(text);
    return escaped.replace(
      /(&quot;.*?&quot;|&#39;.*?&#39;|#.*$|\b(?:if|elif|else|while|and|or|not|import|in|True|False)\b|\b\d+\b)/g,
      (match) => {
        if (match.startsWith("&quot;") || match.startsWith("&#39;")) return '<span class="s">' + match + "</span>";
        if (match.startsWith("#")) return '<span class="c">' + match + "</span>";
        if (/^\d/.test(match)) return '<span class="n">' + match + "</span>";
        return '<span class="k">' + match + "</span>";
      }
    );
  }

  function haikuKey() {
    return localStorage.getItem(KEY_STORAGE) || "";
  }

  function haikuPanel() {
    const saved = haikuKey() ? "Haiku key saved on this browser." : "No Haiku key yet. A fixed rubric judges until you save one.";
    return (
      '<section class="panel"><h3>Claude Haiku 4.5</h3><p class="tutor">The key stays in this browser. It is sent only to the tutor on this machine, which calls Haiku. It is not saved in the repo.</p><div class="key-row"><input id="haiku-key" type="password" autocomplete="off" placeholder="Paste an Anthropic key"><button class="primary" data-action="save-key" data-testid="save-key">Save key</button><button class="text-btn" data-action="clear-key">Clear key</button></div><p data-testid="key-state">' +
      esc(saved) +
      "</p></section>"
    );
  }

  function saveKey() {
    const field = document.getElementById("haiku-key");
    const value = field ? field.value.trim() : "";
    if (!value) return;
    localStorage.setItem(KEY_STORAGE, value);
    render();
  }

  function clearKey() {
    localStorage.removeItem(KEY_STORAGE);
    render();
  }

  function renderWrite(level) {
    const state = currentState();
    const note = state.checkPassed ? "Tests already passed. The writing judge still has to accept it." : "Hidden tests check the behavior. Then the writing is judged.";
    return (
      '<section class="split"><div class="panel"><p class="concept">' +
      esc(level.concept) +
      '</p><p class="tutor">' +
      esc(note) +
      '</p><p class="tutor" data-testid="judge-report">' +
      esc(ui.report) +
      '</p><div class="actions"><button class="primary" data-action="judge-writing" data-testid="judge-writing"' +
      (ui.busy ? " disabled" : "") +
      ">Judge my code</button></div></div><textarea id=\"student-code\" data-testid=\"student-code\" spellcheck=\"false\">" +
      esc(ui.draft) +
      "</textarea></section>"
    );
  }

  function renderReview(level) {
    const no = ui.production === "no" ? " selected" : "";
    const yes = ui.production === "yes" ? " selected" : "";
    return (
      '<section class="split"><div class="panel"><p class="concept">' +
      esc(level.concept) +
      '</p><p class="tutor">The score band is fixed before you answer. Land inside it and the flaw box opens.</p><div class="controls"><button class="choice' +
      no +
      '" data-action="set-production" data-value="no" data-testid="ship-no">Would not ship</button><button class="choice' +
      yes +
      '" data-action="set-production" data-value="yes" data-testid="ship-yes">Would ship</button></div><label class="kicker" for="review-score">Score 1 to 10</label><div class="controls"><input id="review-score" data-testid="review-score" type="number" min="1" max="10" value="' +
      esc(ui.scoreDraft) +
      '"><button class="primary" data-action="check-score" data-testid="check-score"' +
      (ui.busy ? " disabled" : "") +
      '>Check my score</button></div></div><div data-testid="sample-code">' +
      codeBlock(level.sample) +
      "</div></section>"
    );
  }

  function renderFlaws(level) {
    return (
      '<section class="panel" data-testid="zone"><p class="concept">You are in the correct judge zone. +10 Python points.</p><p class="tutor">Name the flaws. Say what breaks if this runs more than once, and what the file does. Haiku judges that list when a key is saved.</p><textarea id="flaw-text" data-testid="flaws" spellcheck="false">' +
      esc(ui.flawDraft) +
      '</textarea><p class="tutor" data-testid="judge-report">' +
      esc(ui.report) +
      '</p><button class="primary" data-action="judge-flaws" data-testid="judge-flaws"' +
      (ui.busy ? " disabled" : "") +
      ">Judge my flaws</button></section>"
    );
  }

  function setProduction(value) {
    const field = document.getElementById("review-score");
    if (field) ui.scoreDraft = field.value;
    ui.production = value;
    render();
  }

  async function judgeWriting() {
    if (ui.busy) return;
    const field = document.getElementById("student-code");
    if (field) ui.draft = field.value;
    const level = currentLevel();
    progress.levels[level.id].draft = ui.draft;
    save();
    ui.busy = true;
    ui.feedback = "Running tests, then judging the writing.";
    ui.feedbackTone = "";
    render();
    let data = null;
    try {
      data = await postJson("/api/write", { code: ui.draft, apiKey: haikuKey() });
    } catch (error) {
      ui.feedback = "The tutor server did not answer. Start python3 -m server from the repo root.";
      ui.feedbackTone = "bad";
    }
    ui.busy = false;
    if (data) applyWrite(level, data);
    render();
  }

  function applyWrite(level, data) {
    const who = data.by === "haiku" ? "Claude Haiku" : "Fixed rubric";
    if (!data.testsPass) {
      ui.feedback = (data.failures || []).join(" ");
      ui.feedbackTone = "bad";
      ui.report = "";
      return;
    }
    progress = logic.awardCheck(
      { points: progress.points, levels: { ...progress.levels, [level.id]: { ...progress.levels[level.id], checkPassed: true } } },
      level.id
    );
    ui.report = who + ": " + (data.note || "");
    if (data.pass) {
      progress = logic.markCleared(progress, level.id);
      progress = logic.awardClear(progress, level.id, false);
      ui.step = "cleared";
      ui.feedback = "";
    } else {
      ui.feedback = "Tests passed. The writing was not accepted.";
      ui.feedbackTone = "bad";
    }
    save();
  }

  async function checkScore() {
    if (ui.busy) return;
    const field = document.getElementById("review-score");
    if (field) ui.scoreDraft = field.value;
    if (ui.production !== "yes" && ui.production !== "no") {
      ui.feedback = "Say if this would ship.";
      ui.feedbackTone = "bad";
      render();
      return;
    }
    ui.busy = true;
    render();
    let data = null;
    try {
      data = await postJson("/api/review-score", {
        production: ui.production === "yes",
        score: Number(ui.scoreDraft),
      });
    } catch (error) {
      ui.feedback = "The tutor server did not answer. Start python3 -m server from the repo root.";
      ui.feedbackTone = "bad";
    }
    ui.busy = false;
    if (!data) {
      render();
      return;
    }
    ui.feedback = data.hint || "";
    ui.feedbackTone = data.in_zone ? "good" : "bad";
    if (data.in_zone) {
      const level = currentLevel();
      progress = logic.awardCheck(
        {
          points: progress.points,
          levels: { ...progress.levels, [level.id]: { ...progress.levels[level.id], checkPassed: true } },
        },
        level.id
      );
      save();
      ui.step = "flaws";
      ui.feedback = "";
    }
    render();
  }

  async function judgeFlaws() {
    if (ui.busy) return;
    const field = document.getElementById("flaw-text");
    if (field) ui.flawDraft = field.value;
    const level = currentLevel();
    progress.levels[level.id].flawDraft = ui.flawDraft;
    save();
    ui.busy = true;
    ui.feedback = "Judging the flaws.";
    ui.feedbackTone = "";
    render();
    let data = null;
    try {
      data = await postJson("/api/review-flaws", { text: ui.flawDraft, apiKey: haikuKey() });
    } catch (error) {
      ui.feedback = "The tutor server did not answer. Start python3 -m server from the repo root.";
      ui.feedbackTone = "bad";
    }
    ui.busy = false;
    if (data) applyFlaws(level, data);
    render();
  }

  function applyFlaws(level, data) {
    const who = data.by === "haiku" ? "Claude Haiku" : "Fixed rubric";
    ui.report = who + ": " + (data.note || "");
    if (!data.pass) {
      ui.feedback = "Not accepted yet.";
      ui.feedbackTone = "bad";
      return;
    }
    progress = logic.markCleared(progress, level.id);
    progress = logic.awardClear(progress, level.id, false);
    ui.step = "cleared";
    ui.feedback = "";
    save();
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("bad status");
    return response.json();
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }
})();
