"""Ask Claude Haiku to judge writing or a flaw list. No key, no call."""

import json
import urllib.error
import urllib.request

from server.judge import HAIKU_MODEL, parse_judge_json

WRITING_PROMPT = """You judge a beginner's Python function. The hidden tests already ran.
Reply with JSON only, no markdown.
Schema: {"pass": true or false, "note": "one or two sentences", "missed": []}
Pass when the code is readable and a branch is a fair way to solve it.
Fail when it is obfuscated or only special-cases a few numbers.
Problem: ahead(score_a, score_b) returns "A", "B", or "tie".
Code:
{code}
"""

FLAW_PROMPT = """You judge whether a student found the real flaws in this Python.
Reply with JSON only, no markdown.
Schema: {"pass": true or false, "note": "one sentence", "missed": ["short flaw names they skipped"]}
The code should not ship. Real flaws:
- the default list is shared across calls
- the file is never closed
- open(..., "w") wipes previous scores
- nothing handles a failed write
- the name is not checked, and str(list) is not a durable format
Pass if their own words clearly cover at least 3 of those. Do not require jargon.
Student wrote:
{text}
"""


def ask_haiku(api_key, prompt):
    key = (api_key or "").strip()
    if not key:
        return None
    body = json.dumps(
        {
            "model": HAIKU_MODEL,
            "max_tokens": 400,
            "messages": [{"role": "user", "content": prompt}],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(_safe(str(exc), key)) from exc
    parts = []
    for block in payload.get("content") or []:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text") or "")
    parsed = parse_judge_json("".join(parts))
    parsed["by"] = "haiku"
    if not parsed["note"]:
        parsed["note"] = "Haiku returned no note."
    return parsed


def judge_writing(api_key, code, tests_pass, local):
    if not tests_pass:
        return local(code, False)
    key = (api_key or "").strip()
    if not key:
        return local(code, True)
    try:
        result = ask_haiku(key, WRITING_PROMPT.format(code=code[:4000]))
    except RuntimeError as exc:
        fallback = local(code, True)
        fallback["note"] = "Haiku did not answer (" + str(exc) + "). " + fallback["note"]
        return fallback
    return result


def judge_flaws(api_key, text, local):
    key = (api_key or "").strip()
    if not key:
        return local(text)
    try:
        return ask_haiku(key, FLAW_PROMPT.format(text=(text or "")[:4000]))
    except RuntimeError as exc:
        fallback = local(text)
        fallback["note"] = "Haiku did not answer (" + str(exc) + "). " + fallback["note"]
        return fallback


def _safe(text, key):
    if key:
        text = text.replace(key, "")
    return text[:240]
