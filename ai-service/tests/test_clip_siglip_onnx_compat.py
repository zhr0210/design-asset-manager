import json
import os
import sys
import tempfile
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.clip_siglip_onnx_compat import check_clip_siglip_onnx_model_compat, probe_clip_siglip_onnx_environment


class TestClipSiglipOnnxCompat(unittest.TestCase):
    def fake_import(self, modules):
        def _import(name):
            if name not in modules:
                raise ModuleNotFoundError(name)
            return modules[name]
        return _import

    def test_environment_probe_reports_optimum_onnxruntime(self):
        result = probe_clip_siglip_onnx_environment(
            import_module=self.fake_import(
                {
                    "onnxruntime": types.SimpleNamespace(__version__="1.20.0", get_available_providers=lambda: ["CoreMLExecutionProvider", "CPUExecutionProvider"]),
                    "transformers": types.SimpleNamespace(__version__="4.48.0"),
                    "optimum.onnxruntime": types.SimpleNamespace(__version__="1.24.0"),
                }
            )
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["compatible"])
        self.assertEqual(result["runtime"], "optimum.onnxruntime")
        self.assertTrue(result["diagnostics"]["onnxruntime"]["available"])
        self.assertIn("CoreMLExecutionProvider", result["diagnostics"]["onnxruntime"]["providers"])

    def test_model_compatibility_checks_folder_shape(self):
        modules = {
            "onnxruntime": types.SimpleNamespace(__version__="1.20.0", get_available_providers=lambda: ["CPUExecutionProvider"]),
            "transformers": types.SimpleNamespace(__version__="4.48.0"),
            "optimum.onnxruntime": types.SimpleNamespace(__version__="1.24.0"),
        }
        with tempfile.TemporaryDirectory() as tmpdir:
            model_root = os.path.join(tmpdir, "clip-vit-base-patch16-onnx")
            os.makedirs(os.path.join(model_root, "onnx"))
            with open(os.path.join(model_root, "config.json"), "w", encoding="utf-8") as f:
                json.dump({"model_type": "clip"}, f)
            with open(os.path.join(model_root, "onnx", "model.onnx"), "wb") as f:
                f.write(b"fake-onnx")

            result = check_clip_siglip_onnx_model_compat(
                {
                    "modelPath": model_root,
                    "modelId": "onnx-community/clip-vit-base-patch16-ONNX",
                    "quantization": "none",
                },
                import_module=self.fake_import(modules),
            )

        self.assertTrue(result["success"])
        self.assertTrue(result["compatible"])
        self.assertEqual(result["runtime"], "optimum.onnxruntime")
        self.assertIn("onnxFiles", result["diagnostics"])
        self.assertEqual(result["diagnostics"]["onnxFiles"], ["model.onnx"])

    def test_missing_dependencies_are_reported_cleanly(self):
        result = check_clip_siglip_onnx_model_compat({}, import_module=self.fake_import({}))
        self.assertFalse(result["compatible"])
        self.assertEqual(result["error"]["code"], "ENVIRONMENT_INSUFFICIENT")


if __name__ == "__main__":
    unittest.main()
