import os
import sys
import tempfile
import types
import unittest
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.onnx_model_load_probe import probe_registered_onnx_model_load


class FakeSession:
    def __init__(self, model_path, providers):
        self.providers = providers

    def get_providers(self):
        return self.providers

    def get_inputs(self):
        return [object()]

    def get_outputs(self):
        return [object(), object()]


class TestOnnxModelLoadProbe(unittest.TestCase):
    def test_real_session_load_returns_sanitized_evidence(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "model.onnx"
            model_path.write_bytes(b"0" * (1024 * 1024))
            ort = types.SimpleNamespace(
                get_available_providers=lambda: ["CoreMLExecutionProvider", "CPUExecutionProvider"],
                InferenceSession=FakeSession,
            )
            result = probe_registered_onnx_model_load(
                import_module=lambda name: ort,
                model_path_resolver=lambda family: Path(tmpdir),
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "loaded_real")
        self.assertEqual(result["providers"][0], "CoreMLExecutionProvider")
        self.assertEqual(result["inputCount"], 1)
        self.assertEqual(result["outputCount"], 2)
        self.assertNotIn(tmpdir, str(result))

    def test_missing_artifact_is_not_failure_claim(self):
        result = probe_registered_onnx_model_load(model_path_resolver=lambda family: None)
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "artifact_missing")
        self.assertEqual(result["errorCode"], "MODEL_ARTIFACT_MISSING")

    def test_missing_runtime_dependency_is_structured(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            (Path(tmpdir) / "model.onnx").write_bytes(b"0" * (1024 * 1024))

            def missing_import(name):
                raise ModuleNotFoundError(name)

            result = probe_registered_onnx_model_load(
                import_module=missing_import,
                model_path_resolver=lambda family: Path(tmpdir),
            )

        self.assertEqual(result["status"], "dependency_missing")
        self.assertEqual(result["errorType"], "ModuleNotFoundError")


if __name__ == "__main__":
    unittest.main()
