(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CampaignLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CHECK_POINTS = 10;
  const LEVEL_POINTS = 40;
  const BOSS_POINTS = 50;
  const QUESTIONS_REQUIRED = 3;
  const MISSES_BEFORE_SHRINK = 3;

  function blankLevel() {
    return {
      checkPassed: false,
      cleared: false,
      misses: 0,
      shrunk: false,
      correctCount: 0,
      checkAwarded: false,
      clearAwarded: false,
      gameWon: false,
      usedQuestionIds: [],
    };
  }

  function emptyProgress(levelIds) {
    const levels = {};
    for (const id of levelIds) levels[id] = blankLevel();
    return { points: 0, levels };
  }

  function isUnlocked(levelId, order, progress) {
    const index = order.indexOf(levelId);
    if (index < 0) return false;
    if (index === 0) return true;
    const prev = progress.levels[order[index - 1]];
    return Boolean(prev && prev.cleared);
  }

  function canEnterGame(levelProgress) {
    return Boolean(levelProgress && levelProgress.checkPassed);
  }

  function pickQuestion(bank, usedIds, kind) {
    const ofKind = bank.filter((q) => q.kind === kind);
    const fresh = ofKind.filter((q) => !usedIds.includes(q.id));
    if (fresh.length) return fresh[0];
    const last = usedIds[usedIds.length - 1];
    return ofKind.find((q) => q.id !== last) || ofKind[0] || null;
  }

  function answerQuestion(levelProgress, question, choice) {
    const correct = choice === question.answer;
    const usedQuestionIds = levelProgress.usedQuestionIds.concat(question.id);
    if (correct) {
      const correctCount = levelProgress.correctCount + 1;
      const checkPassed = correctCount >= QUESTIONS_REQUIRED;
      return {
        progress: {
          ...levelProgress,
          usedQuestionIds,
          correctCount,
          checkPassed,
        },
        correct: true,
        checkJustPassed: checkPassed && !levelProgress.checkPassed,
        shrinkNow: false,
      };
    }
    const misses = levelProgress.misses + 1;
    const shrinkNow = misses >= MISSES_BEFORE_SHRINK && !levelProgress.shrunk;
    return {
      progress: {
        ...levelProgress,
        usedQuestionIds,
        misses: shrinkNow ? 0 : misses,
        shrunk: levelProgress.shrunk || shrinkNow,
      },
      correct: false,
      checkJustPassed: false,
      shrinkNow,
    };
  }

  function awardCheck(state, levelId) {
    const level = state.levels[levelId];
    if (!level || !level.checkPassed || level.checkAwarded) return state;
    return {
      points: state.points + CHECK_POINTS,
      levels: {
        ...state.levels,
        [levelId]: { ...level, checkAwarded: true },
      },
    };
  }

  function awardClear(state, levelId, isBoss) {
    const level = state.levels[levelId];
    if (!level || !level.checkPassed || !level.cleared || level.clearAwarded) return state;
    const gain = isBoss ? BOSS_POINTS : LEVEL_POINTS;
    return {
      points: state.points + gain,
      levels: {
        ...state.levels,
        [levelId]: { ...level, clearAwarded: true },
      },
    };
  }

  function markCleared(state, levelId) {
    const level = state.levels[levelId];
    if (!level || !level.checkPassed) return state;
    return {
      ...state,
      levels: {
        ...state.levels,
        [levelId]: { ...level, cleared: true },
      },
    };
  }

  function markGameWon(state, levelId) {
    const level = state.levels[levelId];
    if (!level || !level.checkPassed) return state;
    return {
      ...state,
      levels: {
        ...state.levels,
        [levelId]: { ...level, gameWon: true },
      },
    };
  }

  function selectionCorrect(selectedIds, lines) {
    const targets = lines.filter((line) => line.role).map((line) => line.id);
    if (selectedIds.length !== targets.length) return false;
    const picked = new Set(selectedIds);
    if (picked.size !== selectedIds.length) return false;
    return targets.every((id) => picked.has(id));
  }

  return {
    CHECK_POINTS,
    LEVEL_POINTS,
    BOSS_POINTS,
    QUESTIONS_REQUIRED,
    MISSES_BEFORE_SHRINK,
    blankLevel,
    emptyProgress,
    isUnlocked,
    canEnterGame,
    pickQuestion,
    answerQuestion,
    awardCheck,
    awardClear,
    markCleared,
    markGameWon,
    selectionCorrect,
  };
});
