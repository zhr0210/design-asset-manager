import os
import sys
import unittest
from pathlib import Path


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, os.fspath(AI_SERVICE_ROOT))

from tools.compare_clip_tf32_quality import PROMPTS, _generated_images


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


if __name__ == "__main__":
    unittest.main()
