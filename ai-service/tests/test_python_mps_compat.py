import os
import sys
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.python_mps_compat import probe_python_mps_environment


class TestPythonMpsCompat(unittest.TestCase):
    def fake_import(self, modules):
        def _import(name):
            if name not in modules:
                raise ModuleNotFoundError(name)
            return modules[name]
        return _import

    def test_mps_ready_reports_optional_status(self):
        torch = types.SimpleNamespace(
            __version__="2.6.0",
            backends=types.SimpleNamespace(
                mps=types.SimpleNamespace(is_built=lambda: True, is_available=lambda: True)
            ),
        )

        result = probe_python_mps_environment(
            import_module=self.fake_import({
                "torch": torch,
                "torchvision": types.SimpleNamespace(__version__="0.21.0"),
                "transformers": types.SimpleNamespace(__version__="4.48.0"),
                "models.ram_tagger": types.SimpleNamespace(__version__="1.0.0"),
                "models.florence2_tagger": types.SimpleNamespace(__version__="1.0.0"),
                "models.clip_design_classifier": types.SimpleNamespace(__version__="1.0.0"),
            })
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["compatible"])
        self.assertEqual(result["runtime"], "torch.mps")
        self.assertEqual(result["status"], "optional")
        self.assertTrue(result["diagnostics"]["torch"]["mpsAvailable"])
        self.assertTrue(result["diagnostics"]["families"]["ram"]["available"])

    def test_missing_torch_reports_environment_insufficient(self):
        result = probe_python_mps_environment(import_module=self.fake_import({}))
        self.assertFalse(result["compatible"])
        self.assertEqual(result["error"]["code"], "ENVIRONMENT_INSUFFICIENT")
        self.assertEqual(result["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
