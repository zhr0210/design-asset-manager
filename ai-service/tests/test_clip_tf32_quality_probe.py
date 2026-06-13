import os
import sys
import unittest
from pathlib import Path


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, os.fspath(AI_SERVICE_ROOT))

from tools.compare_clip_tf32_quality import (
    PROMPTS,
    _comparison_outcome,
    _failure,
    _generated_images,
)


class TestClipTf32QualityProbe(unittest.TestCase):
    def test_generated_fixtures_are_deterministic_and_in_memory(self):
        first = _generated_images()
        second = _generated_images()

        self.assertEqual(len(first), 4)
        self.assertGreaterEqual(len(PROMPTS), len(first))
        self.assertTrue(all(image.size == (224, 224) for image in first))
        self.assertEqual(
            [image.tobytes() for image in first],
            [image.tobytes() for image in second],
        )

    def test_probe_source_is_local_only_and_path_free(self):
        source = (
            AI_SERVICE_ROOT / "tools" / "compare_clip_tf32_quality.py"
        ).read_text(encoding="utf-8")

        self.assertIn("local_files_only=True", source)
        self.assertIn('"fixtureType": "generated_in_memory"', source)
        self.assertNotIn('"modelPath"', source)
        self.assertNotIn("snapshot_download", source)
        self.assertNotIn("from_pretrained(PROMPTS", source)

    def test_failure_evidence_does_not_include_exception_message_or_path(self):
        result = _failure(
            "model_load_failed",
            RuntimeError("failed at C:/private/model/cache"),
        )

        self.assertEqual(result["errorType"], "RuntimeError")
        self.assertNotIn("C:/private", str(result))
        self.assertNotIn("traceback", str(result).lower())

    def test_non_finite_output_cannot_be_reported_as_success(self):
        self.assertEqual(_comparison_outcome(True), (True, "compared_real_model"))
        self.assertEqual(_comparison_outcome(False), (False, "output_invalid"))


if __name__ == "__main__":
    unittest.main()
