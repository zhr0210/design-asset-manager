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


class FakeNamedValue:
    def __init__(self, name):
        self.name = name


class FakeArray:
    def __init__(self, shape):
        self.shape = shape


class FakeClipSession:
    def __init__(self, model_path, providers):
        self.providers = providers

    def get_providers(self):
        return self.providers

    def get_inputs(self):
        return [
            FakeNamedValue("input_ids"),
            FakeNamedValue("pixel_values"),
            FakeNamedValue("attention_mask"),
        ]

    def get_outputs(self):
        return [
            FakeNamedValue("logits_per_image"),
            FakeNamedValue("logits_per_text"),
            FakeNamedValue("text_embeds"),
            FakeNamedValue("image_embeds"),
        ]

    def run(self, output_names, feed):
        assert set(feed) == {"input_ids", "pixel_values", "attention_mask"}
        return [
            FakeArray((1, 2)),
            FakeArray((2, 1)),
            FakeArray((2, 512)),
            FakeArray((1, 512)),
        ]


class FailingClipSession(FakeClipSession):
    def run(self, output_names, feed):
        raise RuntimeError("provider execution failed")


class FakeProcessor:
    @classmethod
    def from_pretrained(cls, model_root, local_files_only):
        return cls()

    def __call__(self, **kwargs):
        return {
            "input_ids": object(),
            "pixel_values": object(),
            "attention_mask": object(),
        }


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
        self.assertEqual(result["operation"], "session_load")
        self.assertNotIn(tmpdir, str(result))

    def test_clip_probe_runs_real_embedding_forward(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "onnx" / "model.onnx"
            model_path.parent.mkdir()
            model_path.write_bytes(b"0" * (1024 * 1024))
            modules = {
                "onnxruntime": types.SimpleNamespace(
                    get_available_providers=lambda: ["CPUExecutionProvider"],
                    InferenceSession=FakeClipSession,
                ),
                "numpy": types.SimpleNamespace(
                    isfinite=lambda value: types.SimpleNamespace(all=lambda: True),
                ),
                "transformers": types.SimpleNamespace(CLIPProcessor=FakeProcessor),
                "PIL.Image": types.SimpleNamespace(new=lambda *args, **kwargs: object()),
            }
            result = probe_registered_onnx_model_load(
                model_family="clip",
                import_module=lambda name: modules[name],
                model_path_resolver=lambda family: Path(tmpdir),
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "loaded_real")
        self.assertEqual(result["operation"], "image_text_embedding")
        self.assertTrue(result["resultFinite"])
        self.assertEqual(result["embeddingDimension"], 512)
        self.assertNotIn(tmpdir, str(result))

    def test_clip_probe_falls_back_to_cpu_after_provider_execution_failure(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "onnx" / "model.onnx"
            model_path.parent.mkdir()
            model_path.write_bytes(b"0" * (1024 * 1024))
            modules = {
                "numpy": types.SimpleNamespace(
                    isfinite=lambda value: types.SimpleNamespace(all=lambda: True),
                ),
                "transformers": types.SimpleNamespace(CLIPProcessor=FakeProcessor),
                "PIL.Image": types.SimpleNamespace(new=lambda *args, **kwargs: object()),
            }

            def create_session(model_path, providers):
                if providers[0] == "CoreMLExecutionProvider":
                    return FailingClipSession(model_path, providers)
                return FakeClipSession(model_path, providers)

            modules["onnxruntime"] = types.SimpleNamespace(
                get_available_providers=lambda: ["CoreMLExecutionProvider", "CPUExecutionProvider"],
                InferenceSession=create_session,
            )
            result = probe_registered_onnx_model_load(
                model_family="clip",
                import_module=lambda name: modules[name],
                model_path_resolver=lambda family: Path(tmpdir),
            )

        self.assertTrue(result["success"])
        self.assertEqual(result["providers"], ["CPUExecutionProvider"])
        self.assertEqual(result["embeddingDimension"], 512)

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
