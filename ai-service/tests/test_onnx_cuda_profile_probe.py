import os
import sys
import unittest
from pathlib import Path


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, os.fspath(AI_SERVICE_ROOT))

from tools.probe_onnx_cuda_profile import _model_summary


class TestOnnxCudaProfileProbe(unittest.TestCase):
    def test_model_summary_keeps_only_sanitized_evidence(self):
        summary = _model_summary(
            {
                "success": True,
                "status": "loaded_real",
                "providers": ["CUDAExecutionProvider", "CPUExecutionProvider"],
                "operation": "image_text_embedding",
                "resultFinite": True,
                "embeddingDimension": 512,
                "inputCount": 3,
                "outputCount": 4,
                "modelPath": "private",
                "checkedAt": "timestamp",
            }
        )

        self.assertTrue(summary["success"])
        self.assertEqual(summary["providers"][0], "CUDAExecutionProvider")
        self.assertEqual(summary["embeddingDimension"], 512)
        self.assertNotIn("modelPath", summary)
        self.assertNotIn("checkedAt", summary)

    def test_probe_source_does_not_install_or_download(self):
        source = (
            AI_SERVICE_ROOT / "tools" / "probe_onnx_cuda_profile.py"
        ).read_text(encoding="utf-8")

        self.assertNotIn("pip install", source)
        self.assertNotIn("snapshot_download", source)
        self.assertNotIn('"modelPath"', source)


if __name__ == "__main__":
    unittest.main()
