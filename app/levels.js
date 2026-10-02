(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CampaignLevels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function q(id, kind, prompt, code, choices, answer, prints) {
    return { id, kind, prompt, code, choices, answer, prints };
  }

  const variables = {
    id: "variables",
    title: "Variables",
    boss: false,
    game: "highlow",
    concept: "A variable is a name that holds a value. A new assignment replaces what that name holds.",
    pointPrompt: "Click the line that stores the secret.",
    pointHint: "Find the name secret.",
    winText: "You got it.",
    roles: { 2: "target" },
    kinds: ["value", "print", "reassign"],
    module: {
      code: 'name = "Karthik"\nscore = 0\nscore = score + 1\nprint(name)\nprint(score)\n',
      output: "Karthik\n1\n",
    },
    shrink: {
      note: "Three misses. The example gets smaller. Run it, then try the check again.",
      code: "score = 1\nprint(score)\n",
      output: "1\n",
    },
    program:
      'import random\n\nsecret = random.randint(1, 10)\nguess = 0\n\nwhile guess != secret:\n    guess = int(input("Guess: "))\n    if guess < secret:\n        print("higher")\n    elif guess > secret:\n        print("lower")\n    else:\n        print("you got it")\n',
    tutor: "Guess a number from 1 to 10. The secret and your guess are variables.",
    questions: [
      q(
        "var-value-1",
        "value",
        "What does this print? That is the value in score.",
        "score = 0\nscore = score + 1\nprint(score)\n",
        ["0", "1", "2", "score"],
        "1",
        "1\n"
      ),
      q(
        "var-value-2",
        "value",
        "What does this print? That is the value in lives.",
        "lives = 3\nlives = lives - 1\nprint(lives)\n",
        ["3", "2", "4", "lives"],
        "2",
        "2\n"
      ),
      q(
        "var-value-3",
        "value",
        "What does this print? That is the value in gold.",
        "gold = 10\ngold = gold - 4\nprint(gold)\n",
        ["10", "4", "6", "14"],
        "6",
        "6\n"
      ),
      q(
        "var-print-1",
        "print",
        "What does this print?",
        'name = "Karthik"\nscore = 2\nprint(name)\nprint(score)\n',
        ["Karthik, then 2", "2, then Karthik", "name, then score", "nothing"],
        "Karthik, then 2",
        "Karthik\n2\n"
      ),
      q(
        "var-print-2",
        "print",
        "What does this print?",
        "secret = 7\nprint(secret)\n",
        ["secret", "7", "0", "nothing"],
        "7",
        "7\n"
      ),
      q(
        "var-print-3",
        "print",
        "What does this print?",
        'player = "Ada"\nprint(player)\n',
        ["player", "Ada", "0", "nothing"],
        "Ada",
        "Ada\n"
      ),
      q(
        "var-re-1",
        "reassign",
        "What does this print after both assignments?",
        "score = 1\nscore = 4\nprint(score)\n",
        ["1", "4", "5", "score"],
        "4",
        "4\n"
      ),
      q(
        "var-re-2",
        "reassign",
        "What does this print?",
        "guess = 3\nguess = 8\nprint(guess)\n",
        ["3", "8", "11", "guess"],
        "8",
        "8\n"
      ),
      q(
        "var-re-3",
        "reassign",
        "What does this print? That is the value left in name.",
        'name = "Ada"\nname = "Bo"\nprint(name)\n',
        ["Ada", "Bo", "Ada Bo", "name"],
        "Bo",
        "Bo\n"
      ),
    ],
  };

  const conditionals = {
    id: "conditionals",
    title: "Conditionals",
    boss: false,
    game: "scores",
    concept: "The program takes the first branch whose test is true. If none are true, it takes else.",
    pointPrompt: "Click the line that decides who is ahead.",
    pointHint: "It starts with if.",
    winText: "Someone reached 5.",
    roles: { 5: "target" },
    kinds: ["taken", "other", "tie"],
    module: {
      code:
        'score_a = 3\nscore_b = 1\nif score_a > score_b:\n    print("A")\nelse:\n    print("B")\n',
      output: "A\n",
    },
    shrink: {
      note: "Three misses. The example gets smaller. Run it, then try the check again.",
      code: 'if 2 > 1:\n    print("yes")\nelse:\n    print("no")\n',
      output: "yes\n",
    },
    tutor: "Add a point. The branch says who is ahead. First to 5 clears the game.",
    questions: [
      q(
        "if-taken-1",
        "taken",
        "What does this print?",
        'score_a = 3\nscore_b = 1\nif score_a > score_b:\n    print("A")\nelse:\n    print("B")\n',
        ["A", "B", "tie", "nothing"],
        "A",
        "A\n"
      ),
      q(
        "if-taken-2",
        "taken",
        "What does this print?",
        'gold = 9\nif gold > 5:\n    print("buy")\nelse:\n    print("skip")\n',
        ["buy", "skip", "9", "nothing"],
        "buy",
        "buy\n"
      ),
      q(
        "if-taken-3",
        "taken",
        "What does this print?",
        'n = 11\nif n < 10:\n    print("low")\nelse:\n    print("high")\n',
        ["low", "high", "11", "nothing"],
        "high",
        "high\n"
      ),
      q(
        "if-other-1",
        "other",
        "What does this print?",
        'score_a = 2\nscore_b = 5\nif score_a > score_b:\n    print("A")\nelif score_b > score_a:\n    print("B")\nelse:\n    print("tie")\n',
        ["A", "B", "tie", "nothing"],
        "B",
        "B\n"
      ),
      q(
        "if-other-2",
        "other",
        "What does this print?",
        'guess = 8\nsecret = 5\nif guess < secret:\n    print("higher")\nelif guess > secret:\n    print("lower")\nelse:\n    print("hit")\n',
        ["higher", "lower", "hit", "8"],
        "lower",
        "lower\n"
      ),
      q(
        "if-other-3",
        "other",
        "What does this print?",
        'gold = 2\nif gold > 5:\n    print("buy")\nelse:\n    print("skip")\n',
        ["buy", "skip", "2", "nothing"],
        "skip",
        "skip\n"
      ),
      q(
        "if-tie-1",
        "tie",
        "What does this print?",
        'score_a = 4\nscore_b = 4\nif score_a > score_b:\n    print("A")\nelif score_b > score_a:\n    print("B")\nelse:\n    print("tie")\n',
        ["A", "B", "tie", "4"],
        "tie",
        "tie\n"
      ),
      q(
        "if-tie-2",
        "tie",
        "What does this print?",
        'a = 1\nb = 1\nif a > b:\n    print("A")\nelif b > a:\n    print("B")\nelse:\n    print("tie")\n',
        ["A", "B", "tie", "1"],
        "tie",
        "tie\n"
      ),
      q(
        "if-tie-3",
        "tie",
        "What does this print?",
        'n = 10\nif n < 10:\n    print("low")\nelif n > 10:\n    print("high")\nelse:\n    print("same")\n',
        ["low", "high", "same", "10"],
        "same",
        "same\n"
      ),
    ],
  };

  const loops = {
    id: "loops",
    title: "Loops",
    boss: false,
    game: "shop",
    concept: "The body runs, then the test is checked again. When the test is false, the loop stops.",
    pointPrompt: "Click the line that repeats until he leaves.",
    pointHint: "It starts with while.",
    winText: "You bought the map and left.",
    roles: { 5: "target" },
    kinds: ["times", "result", "stop"],
    module: {
      code: "n = 0\nwhile n < 3:\n    n = n + 1\nprint(n)\n",
      output: "3\n",
    },
    shrink: {
      note: "Three misses. The example gets smaller. Run it, then try the check again.",
      code: "n = 0\nwhile n < 1:\n    n = n + 1\nprint(n)\n",
      output: "1\n",
    },
    program:
      'gold = 8\nprice = 3\nowned = False\nchoice = ""\n\nwhile choice != "leave":\n    choice = input("buy or leave: ")\n    if choice == "buy" and gold >= price:\n        gold = gold - price\n        owned = True\n    elif choice == "buy":\n        print("not enough")\n',
    tutor: "Gold starts at 8. The map costs 3. Buy it, then leave. Leaving without it keeps the loop open.",
    questions: [
      q(
        "loop-times-1",
        "times",
        "runs counts the body. What does this print?",
        "n = 0\nruns = 0\nwhile n < 3:\n    runs = runs + 1\n    n = n + 1\nprint(runs)\n",
        ["0", "2", "3", "4"],
        "3",
        "3\n"
      ),
      q(
        "loop-times-2",
        "times",
        "runs counts the body. What does this print?",
        "n = 0\nruns = 0\nwhile n < 1:\n    runs = runs + 1\n    n = n + 1\nprint(runs)\n",
        ["0", "1", "2", "n"],
        "1",
        "1\n"
      ),
      q(
        "loop-times-3",
        "times",
        "runs counts the body. What does this print?",
        "n = 2\nruns = 0\nwhile n < 2:\n    runs = runs + 1\n    n = n + 1\nprint(runs)\n",
        ["0", "1", "2", "3"],
        "0",
        "0\n"
      ),
      q(
        "loop-result-1",
        "result",
        "What does this print?",
        "n = 0\nwhile n < 3:\n    n = n + 1\nprint(n)\n",
        ["0", "2", "3", "4"],
        "3",
        "3\n"
      ),
      q(
        "loop-result-2",
        "result",
        "What does this print?",
        "n = 0\nwhile n < 4:\n    n = n + 1\nprint(n)\n",
        ["3", "4", "5", "0"],
        "4",
        "4\n"
      ),
      q(
        "loop-result-3",
        "result",
        "What does this print?",
        "n = 1\nwhile n < 3:\n    n = n + 1\nprint(n)\n",
        ["1", "2", "3", "4"],
        "3",
        "3\n"
      ),
      q(
        "loop-stop-1",
        "stop",
        "After the loop, what does this print? True would mean the test is still true.",
        "n = 0\nwhile n < 2:\n    n = n + 1\nprint(n < 2)\n",
        ["True", "False", "2", "0"],
        "False",
        "False\n"
      ),
      q(
        "loop-stop-2",
        "stop",
        "What does this print when the loop stops?",
        'choice = "buy"\nwhile choice != "leave":\n    choice = "leave"\nprint(choice)\n',
        ["buy", "leave", "choice", "nothing"],
        "leave",
        "leave\n"
      ),
      q(
        "loop-stop-3",
        "stop",
        "What does this print? That is n when the loop stops.",
        "n = 0\nwhile n < 2:\n    n = n + 1\nprint(n)\n",
        ["0", "1", "2", "3"],
        "2",
        "2\n"
      ),
    ],
  };

  const boss = {
    id: "boss-a",
    title: "Boss A",
    boss: true,
    game: "dice",
    concept: "This file uses a variable, a branch, and a loop together. Read it, then answer the mix.",
    pointPrompt: "Click where p1 starts, where the turn is chosen, and where the rolls repeat. Nothing else.",
    pointHint: null,
    winText: "Someone reached 20.",
    roles: { 2: "variable", 6: "loop", 8: "branch" },
    kinds: ["value", "branch", "count"],
    module: {
      code:
        'secret = 5\nguess = 8\nif guess > secret:\n    print("lower")\nn = 0\nwhile n < 2:\n    n = n + 1\nprint(n)\n',
      output: "lower\n2\n",
    },
    shrink: {
      note: "Three misses. The example gets smaller. Run it, then try the check again.",
      code: "p1 = 0\np1 = p1 + 1\nif p1 >= 1:\n    print(p1)\n",
      output: "1\n",
    },
    program:
      "import random\n\np1 = 0\np2 = 0\nturn = 1\n\nwhile p1 < 20 and p2 < 20:\n    roll = random.randint(1, 6)\n    if turn == 1:\n        p1 = p1 + roll\n        turn = 2\n    else:\n        p2 = p2 + roll\n        turn = 1\n\nif p1 >= 20:\n    print(\"p1 wins\")\nelse:\n    print(\"p2 wins\")\n",
    tutor: "Hints are off. Roll. First to 20 wins.",
    questions: [
      q(
        "boss-value-1",
        "value",
        "What does this print? That is the value in p1.",
        "p1 = 0\np1 = p1 + 4\nprint(p1)\n",
        ["0", "4", "5", "p1"],
        "4",
        "4\n"
      ),
      q(
        "boss-value-2",
        "value",
        "What does this print? That is the value in guess.",
        "secret = 5\nguess = 8\nprint(guess)\n",
        ["5", "8", "13", "guess"],
        "8",
        "8\n"
      ),
      q(
        "boss-value-3",
        "value",
        "What does this print?",
        "turn = 1\nturn = 2\nprint(turn)\n",
        ["1", "2", "3", "turn"],
        "2",
        "2\n"
      ),
      q(
        "boss-branch-1",
        "branch",
        "What does this print?",
        'guess = 8\nsecret = 5\nif guess > secret:\n    print("lower")\nelse:\n    print("higher")\n',
        ["lower", "higher", "8", "nothing"],
        "lower",
        "lower\n"
      ),
      q(
        "boss-branch-2",
        "branch",
        "What does this print?",
        'p1 = 20\nif p1 >= 20:\n    print("p1 wins")\nelse:\n    print("p2 wins")\n',
        ["p1 wins", "p2 wins", "20", "nothing"],
        "p1 wins",
        "p1 wins\n"
      ),
      q(
        "boss-branch-3",
        "branch",
        "What does this print?",
        'roll = 6\nif roll == 1:\n    print("one")\nelse:\n    print("more")\n',
        ["one", "more", "6", "nothing"],
        "more",
        "more\n"
      ),
      q(
        "boss-count-1",
        "count",
        "What does this print?",
        "n = 0\nwhile n < 2:\n    n = n + 1\nprint(n)\n",
        ["0", "1", "2", "3"],
        "2",
        "2\n"
      ),
      q(
        "boss-count-2",
        "count",
        "What does this print?",
        "n = 0\nwhile n < 4:\n    n = n + 1\nprint(n)\n",
        ["3", "4", "5", "0"],
        "4",
        "4\n"
      ),
      q(
        "boss-count-3",
        "count",
        "What does this print? The body does not run.",
        "n = 3\nwhile n < 3:\n    n = n + 1\nprint(n)\n",
        ["0", "2", "3", "4"],
        "3",
        "3\n"
      ),
    ],
  };

  function conditionalsProgram(nameA, nameB) {
    return [
      "name_a = " + JSON.stringify(nameA),
      "name_b = " + JSON.stringify(nameB),
      "score_a = 0",
      "score_b = 0",
      "",
      "if score_a > score_b:",
      '    print(name_a + " is ahead")',
      "elif score_b > score_a:",
      '    print(name_b + " is ahead")',
      "else:",
      '    print("tied")',
      "",
    ].join("\n");
  }

  conditionals.program = conditionalsProgram("Ava", "Bo");

  const levels = [variables, conditionals, loops, boss];
  const order = levels.map((level) => level.id);
  const byId = Object.fromEntries(levels.map((level) => [level.id, level]));

  const acts = [
    {
      id: "I",
      title: "Tiny games",
      blurb: "Variables, conditionals, and loops. Each one is a module, a check, then a game.",
    },
    {
      id: "II",
      title: "Programs with parts",
      blurb: "Functions, collections, files, errors, modules. Not in this build.",
    },
    {
      id: "III",
      title: "Modules and tests",
      blurb: "A small class, a few tests, a program split into files. Not in this build.",
    },
    {
      id: "IV",
      title: "Other people's Python",
      blurb: "Read a real file and change one behavior. Not in this build.",
    },
    {
      id: "V",
      title: "Judge generated code",
      blurb: "One judge level is open under Write and judge. Reviewing a full diff is not in this build.",
    },
    {
      id: "VI",
      title: "System design",
      blurb: "Opens only after you can write a small program alone. Not in this build.",
    },
  ];

  const practice = [
    {
      id: "write-ahead",
      title: "Write the branch",
      alwaysOpen: true,
      mode: "write",
      next: "judge-save",
      concept: "Write ahead(score_a, score_b). Return A when the first score is higher, B when the second is higher, and tie when they match.",
      starter: 'def ahead(score_a, score_b):\n    return "tie"\n',
    },
    {
      id: "judge-save",
      title: "Judge this file",
      alwaysOpen: true,
      mode: "judge",
      concept: "Say if this would ship in production, give it a score from 1 to 10, then name the flaws.",
      sample:
        'def save_scores(name, scores=[]):\n    scores.append(name)\n    handle = open("scores.txt", "w")\n    handle.write(str(scores))\n    return scores\n',
    },
  ];

  const allIds = order.concat(practice.map((level) => level.id));
  for (const level of practice) byId[level.id] = level;

  function linesFor(level, ctx) {
    const names = ctx || { nameA: "Ava", nameB: "Bo" };
    const program =
      level.id === "conditionals"
        ? conditionalsProgram(names.nameA || "Ava", names.nameB || "Bo")
        : level.program;
    return program.split("\n").map((text, index) => ({
      id: "L" + (index + 1),
      text,
      role: level.roles[index] || null,
    }));
  }

  return { levels, order, byId, acts, linesFor, conditionalsProgram, practice, allIds };
});
