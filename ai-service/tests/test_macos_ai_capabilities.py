import os
import sys
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.macos_ai_capabilities import probe_macos_ai_capabilities


class TestMacOSAiCapabilities(unittest.TestCase):
    def fake_import(self, modules):
        def _import(name):
            if name not in modules:
                raise ModuleNotFoundError(name)
            return modules[name]
        return _import

    def test_apple_silicon_full_probe_shape(self):
        torch = types.SimpleNamespace(
            __version__="2.6.0",
            backends=types.SimpleNamespace(
                mps=types.SimpleNamespace(is_built=lambda: True, is_available=lambda: True)
            ),
        )
        ort = types.SimpleNamespace(
            __version__="1.20.0",
            get_available_providers=lambda: ["CoreMLExecutionProvider", "CPUExecutionProvider"],
        )
        mlx = types.SimpleNamespace(__version__="0.22.0")
        optimum_onnxruntime = types.SimpleNamespace(__version__="1.20.1")
        ram = types.SimpleNamespace(__version__="1.0.0")
        florence = types.SimpleNamespace(__version__="1.0.0")
        clip = types.SimpleNamespace(__version__="1.0.0")
        wd = types.SimpleNamespace(__version__="1.0.0")
        rapidocr = types.SimpleNamespace(__version__="1.0.0")
        paddleocr = types.SimpleNamespace(__version__="1.0.0")

        result = probe_macos_ai_capabilities(
            platform_name="darwin",
            machine="arm64",
            import_module=self.fake_import({
                "torch": torch,
                "onnxruntime": ort,
                "mlx": mlx,
                "transformers": types.SimpleNamespace(__version__="4.48.0"),
                "optimum.onnxruntime": optimum_onnxruntime,
                "models.ram_tagger": ram,
                "models.florence2_tagger": florence,
                "models.clip_design_classifier": clip,
                "models.wd_tagger": wd,
                "rapidocr_onnxruntime": rapidocr,
                "paddleocr": paddleocr,
            }),
        )

        self.assertTrue(result["isMacOS"])
        self.assertTrue(result["isAppleSilicon"])
        self.assertTrue(result["torch"]["mpsAvailable"])
        self.assertTrue(result["onnxruntime"]["coremlAvailable"])
        self.assertTrue(result["mlx"]["available"])
        self.assertTrue(result["clipSiglipOnnx"]["available"])
        self.assertTrue(result["ram"]["available"])
        self.assertTrue(result["rapidocr"]["available"])
        self.assertTrue(result["paddleocr"]["available"])
        self.assertEqual([lane["id"] for lane in result["lanes"]], ["python-mps", "onnx-runtime", "llama"])
        self.assertIn("Qwen3-VL MLX", [cap["label"] for cap in result["lanes"][2]["capabilities"]])
        self.assertEqual(result["lanes"][0]["capabilities"][0]["status"], "optional")
        self.assertEqual(result["lanes"][1]["capabilities"][0]["status"], "optional")
        self.assertEqual(result["lanes"][1]["capabilities"][3]["status"], "optional")
        self.assertEqual(result["lanes"][0]["capabilities"][0]["modelFamily"], "RAM++")
        self.assertEqual(result["lanes"][1]["capabilities"][1]["modelFamily"], "RapidOCR")

    def test_missing_modules_still_reports_fallbacks(self):
        result = probe_macos_ai_capabilities(
            platform_name="darwin",
            machine="x86_64",
            import_module=self.fake_import({}),
        )

        self.assertTrue(result["isMacOS"])
        self.assertFalse(result["isAppleSilicon"])
        self.assertFalse(result["torch"]["available"])
        self.assertFalse(result["onnxruntime"]["available"])
        self.assertFalse(result["mlx"]["available"])
        self.assertFalse(result["clipSiglipOnnx"]["available"])
        self.assertFalse(result["ram"]["available"])
        self.assertFalse(result["rapidocr"]["available"])
        self.assertFalse(result["paddleocr"]["available"])
        self.assertEqual(result["lanes"][0]["capabilities"][0]["modelFamily"], "RAM++")
        self.assertEqual(result["lanes"][0]["status"], "unavailable")
        self.assertEqual(result["lanes"][1]["status"], "unavailable")
        self.assertEqual(result["lanes"][2]["status"], "planned")

    def test_non_macos_marks_llama_unavailable_but_keeps_external_fallback(self):
        result = probe_macos_ai_capabilities(
            platform_name="win32",
            machine="x64",
            import_module=self.fake_import({}),
        )

        llama = next(lane for lane in result["lanes"] if lane["id"] == "llama")
        self.assertEqual(llama["status"], "unavailable")
        self.assertEqual(llama["capabilities"][-1]["label"], "external HTTP fallback")
        self.assertEqual(llama["capabilities"][-1]["status"], "fallback")


if __name__ == "__main__":
    unittest.main()
