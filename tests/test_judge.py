import unittest

from server.judge import local_flaws, local_writing, parse_judge_json, score_zone
from server.runner import run_ahead

GOOD = """
def ahead(score_a, score_b):
    if score_a > score_b:
        return "A"
    if score_b > score_a:
        return "B"
    return "tie"
"""

STUB = """
def ahead(score_a, score_b):
    return "tie"
"""


class ZoneTest(unittest.TestCase):
    def test_correct_zone_is_not_production_and_inside_the_band(self):
        self.assertTrue(score_zone(False, 2)["in_zone"])
        self.assertTrue(score_zone(False, 4)["in_zone"])
        self.assertIn("correct judge zone", score_zone(False, 3)["hint"])

    def test_shipping_it_or_a_score_outside_the_band_is_rejected(self):
        self.assertFalse(score_zone(True, 3)["in_zone"])
        self.assertFalse(score_zone(False, 8)["in_zone"])
        self.assertFalse(score_zone(False, 1)["in_zone"])
        self.assertIn("too high", score_zone(False, 9)["hint"])
        self.assertIn("too low", score_zone(False, 1)["hint"])


class RubricTest(unittest.TestCase):
    def test_three_real_flaws_pass_and_one_does_not(self):
        text = (
            "The default list is shared across calls. "
            "The file is never closed. "
            "Opening with \"w\" overwrites old scores."
        )
        self.assertTrue(local_flaws(text)["pass"])
        self.assertFalse(local_flaws("it looks messy")["pass"])

    def test_writing_rubric_requires_a_branch_after_tests_pass(self):
        self.assertTrue(local_writing(GOOD, True)["pass"])
        self.assertFalse(local_writing(STUB, True)["pass"])
        self.assertFalse(local_writing(GOOD, False)["pass"])


class RunnerTest(unittest.TestCase):
    def test_a_real_branch_passes_hidden_cases(self):
        result = run_ahead(GOOD)
        self.assertTrue(result["tests_pass"], result["failures"])

    def test_a_constant_return_fails(self):
        result = run_ahead(STUB)
        self.assertFalse(result["tests_pass"])
        self.assertTrue(result["failures"])


class ParseTest(unittest.TestCase):
    def test_fenced_json_from_haiku(self):
        parsed = parse_judge_json('```json\n{"pass": true, "note": "Clear enough.", "missed": []}\n```')
        self.assertTrue(parsed["pass"])
        self.assertEqual(parsed["note"], "Clear enough.")


if __name__ == "__main__":
    unittest.main()
