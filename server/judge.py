"""Score zone and flaw rubric. The zone is fixed. Haiku is optional."""

HAIKU_MODEL = "claude-haiku-4-5-20251001"
SCORE_MIN = 2
SCORE_MAX = 4

FLAW_GROUPS = [
    ("shared default list", ["default argument", "default list", "mutable", "shared list", "same list"]),
    ("file never closed", ["never closed", "not closed", "close the", "with open", "file handle", "leak"]),
    ("file is wiped", ["overwrite", "wipes", "truncat", "write mode", '"w"', "'w'"]),
    ("no error handling", ["error", "exception", "disk", "fails", "crash", "try"]),
    ("weak format or name", ["valid", "empty", "format", "repr", "str(scores)", "not durable"]),
]


def score_zone(production, score):
    """production is True if the student says it should ship."""
    try:
        number = int(score)
    except (TypeError, ValueError):
        return {"in_zone": False, "hint": "Give a score from 1 to 10."}
    if number < 1 or number > 10:
        return {"in_zone": False, "hint": "Give a score from 1 to 10."}
    if production:
        return {
            "in_zone": False,
            "hint": "This should not ship. A single happy path is not production.",
        }
    if number > SCORE_MAX:
        return {"in_zone": False, "hint": "That score is too high for code you would not ship."}
    if number < SCORE_MIN:
        return {"in_zone": False, "hint": "That score is too low. The happy path does run."}
    return {"in_zone": True, "hint": "You are in the correct judge zone."}


def local_flaws(text):
    low = (text or "").lower()
    missed = []
    for name, words in FLAW_GROUPS:
        if not any(word in low for word in words):
            missed.append(name)
    hit = len(FLAW_GROUPS) - len(missed)
    passed = hit >= 3
    if passed:
        note = "The fixed rubric accepts this. You named enough of the real flaws."
    else:
        note = "Not enough of the real flaws yet. Say what breaks if this runs more than once, and what the file does."
    return {"pass": passed, "note": note, "missed": missed, "by": "rubric"}


def local_writing(code, tests_pass):
    if not tests_pass:
        return {"pass": False, "note": "The tests have not passed.", "by": "rubric"}
    low = code or ""
    if "def ahead" not in low or "if" not in low:
        return {
            "pass": False,
            "note": "Write a function named ahead that uses a branch.",
            "by": "rubric",
        }
    return {
        "pass": True,
        "note": "Tests passed, and the function uses a branch. Save a Haiku key if you want Claude to judge the writing.",
        "by": "rubric",
    }


def parse_judge_json(text):
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if "```" in raw:
            raw = raw.rsplit("```", 1)[0]
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end < start:
        raise ValueError("Haiku did not return JSON")
    import json

    data = json.loads(raw[start : end + 1])
    missed = data.get("missed") or []
    if not isinstance(missed, list):
        missed = []
    return {
        "pass": bool(data.get("pass")),
        "note": str(data.get("note") or "").strip()[:500],
        "missed": [str(item)[:80] for item in missed][:6],
    }
