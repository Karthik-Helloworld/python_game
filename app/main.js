(function () {
  const logic = window.CampaignLogic;
  const content = window.CampaignLevels;
  const STORAGE_KEY = "python-campaign-v1";

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
  };

  let progress = load();

  const app = document.getElementById("app");
  app.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);

  render();

  function load() {
    const base = logic.emptyProgress(content.order);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      base.points = Number(saved.points) || 0;
      for (const id of content.order) {
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
    if (!window.confirm("Clear all Python points and start Act I over?")) return;
    progress = logic.emptyProgress(content.order);
    save();
    showMap();
  }

  function openLevel(id) {
    if (!logic.isUnlocked(id, content.order, progress)) return;
    const level = content.byId[id];
    const state = progress.levels[id];
    ui.screen = "level";
    ui.levelId = id;
    ui.feedback = "";
    ui.feedbackTone = "";
    ui.selected = [];
    ui.moduleRan = Boolean(state.checkPassed || state.correctCount > 0 || state.usedQuestionIds.length);
    ui.shrinkRan = false;
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
    app.innerHTML = '<div class="wrap">' + header() + body() + "</div>";
    const guess = document.getElementById("guess");
    if (guess) guess.focus();
  }

  function header() {
    return (
      '<header class="top"><div><p class="eyebrow">Python Campaign</p><h1>Karthik</h1></div>' +
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

  function renderMap() {
    const cleared = content.order.filter((id) => progress.levels[id].cleared).length;
    const cards = content.order
      .map((id, index) => {
        const level = content.byId[id];
        const state = progress.levels[id];
        const open = logic.isUnlocked(id, content.order, progress);
        const total = logic.CHECK_POINTS + (level.boss ? logic.BOSS_POINTS : logic.LEVEL_POINTS);
        let status = total + " points";
        if (!open) status = "Locked";
        else if (state.cleared) status = "Cleared";
        else if (state.gameWon) status = "Point at the file";
        else if (state.checkPassed) status = "Game open";
        else if (state.correctCount > 0) status = "Check " + state.correctCount + "/3";
        return (
          '<li><button class="level-card' +
          (level.boss ? " boss" : "") +
          '" data-testid="level-' +
          level.id +
          '" data-action="open-level" data-level="' +
          level.id +
          '"' +
          (open ? "" : " disabled") +
          '><span class="index">' +
          (index + 1) +
          '</span><span><p class="kicker">' +
          (level.boss ? "Boss" : "Level") +
          "</p><h2>" +
          esc(level.title) +
          '</h2></span><span class="status">' +
          status +
          "</span></button></li>"
        );
      })
      .join("");
    const later = content.acts
      .filter((act) => act.id !== "I")
      .map(
        (act) =>
          '<button class="later-card" data-action="open-act" data-act="' +
          act.id +
          '"><p class="kicker">Act ' +
          act.id +
          "</p><h3>" +
          esc(act.title) +
          "</h3><p>" +
          esc(act.blurb) +
          "</p></button>"
      )
      .join("");
    return (
      '<main data-testid="map"><section class="act"><div class="act-head"><h2>Act I · Tiny games</h2><p>' +
      cleared +
      '/4 cleared</p></div><p class="lede">A level opens with a short module. Three questions have to be right before the game unlocks. Clearing the game pays the Python points. A miss swaps in a new question and costs nothing.</p><ol class="path">' +
      cards +
      '</ol></section><section class="later"><h2>Later acts</h2><div class="later-grid">' +
      later +
      '</div></section><button class="text-btn reset" data-action="reset">Reset progress</button></main>'
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

  function stepBody(level, state) {
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
    const nextId = content.order[content.order.indexOf(level.id) + 1];
    const next = nextId ? content.byId[nextId] : null;
    const nextButton = next
      ? '<button class="primary" data-action="open-level" data-level="' + next.id + '" data-testid="next-level">' + esc(next.title) + "</button>"
      : '<p class="tutor">Act I is finished. Later acts are not in this build. Your points stay saved.</p>';
    return (
      '<section class="panel" data-testid="cleared"><p class="concept">Level cleared. +' +
      gain +
      " Python points.</p><p>You have " +
      progress.points +
      ".</p>" +
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
