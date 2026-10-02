"""Run a student's ahead() function in a short-lived process."""

import json
import subprocess
import sys
import textwrap

CASES = [
    (3, 1, "A"),
    (1, 4, "B"),
    (2, 2, "tie"),
    (0, 0, "tie"),
    (10, 9, "A"),
    (5, 8, "B"),
]

HARNESS = textwrap.dedent(
    """
    import json
    code = open("student.py", encoding="utf-8").read()
    ns = {}
    try:
        exec(compile(code, "student.py", "exec"), ns)
    except Exception as exc:
        print(json.dumps({"ok": False, "failures": ["The file did not run: " + str(exc)]}))
        raise SystemExit(0)
    fn = ns.get("ahead")
    failures = []
    if not callable(fn):
        failures.append("Define ahead(score_a, score_b).")
    else:
        cases = json.loads(open("cases.json", encoding="utf-8").read())
        for score_a, score_b, expected in cases:
            try:
                got = fn(score_a, score_b)
            except Exception as exc:
                failures.append("ahead(%r, %r) raised %s" % (score_a, score_b, exc))
                continue
            if got != expected:
                failures.append(
                    "ahead(%r, %r) returned %r, expected %r" % (score_a, score_b, got, expected)
                )
    print(json.dumps({"ok": not failures, "failures": failures}))
    """
)


def run_ahead(code):
    source = code or ""
    if len(source) > 4000:
        return {"tests_pass": False, "failures": ["That file is too long for this level."]}
    return _run_with_files(source)


def _run_with_files(source):
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        (root / "student.py").write_text(source, encoding="utf-8")
        (root / "cases.json").write_text(json.dumps(CASES), encoding="utf-8")
        try:
            completed = subprocess.run(
                [sys.executable, "-c", HARNESS],
                capture_output=True,
                timeout=2,
                cwd=folder,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return {"tests_pass": False, "failures": ["The function took too long."]}
    stdout = completed.stdout.decode("utf-8", errors="replace").strip().splitlines()
    if not stdout:
        err = completed.stderr.decode("utf-8", errors="replace")[:300]
        return {"tests_pass": False, "failures": [err or "The tests produced no result."]}
    try:
        payload = json.loads(stdout[-1])
    except json.JSONDecodeError:
        return {"tests_pass": False, "failures": ["The tests produced no result."]}
    failures = [str(item) for item in payload.get("failures") or []]
    return {"tests_pass": bool(payload.get("ok")) and not failures, "failures": failures}
