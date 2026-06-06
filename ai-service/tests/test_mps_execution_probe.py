import os
import sys
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.mps_execution_probe import probe_python_mps_execution


class TestMpsExecutionProbe(unittest.TestCase):
    def test_real_execution_returns_sanitized_evidence(self):
        torch = types.SimpleNamespace(
            backends=types.SimpleNamespace(
                mps=types.SimpleNamespace(is_available=lambda: True)
            )
        )
        result = probe_python_mps_execution(
            import_module=lambda name: torch,
            platform_name="darwin",
            execute_probe=lambda module: 30.0,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "executed_real")
        self.assertEqual(result["runtime"], "torch.mps")
        self.assertTrue(result["resultFinite"])

    def test_unavailable_backend_is_not_execution_failure(self):
        torch = types.SimpleNamespace(
            backends=types.SimpleNamespace(
                mps=types.SimpleNamespace(is_available=lambda: False)
            )
        )
        result = probe_python_mps_execution(
            import_module=lambda name: torch,
            platform_name="darwin",
        )

        self.assertEqual(result["status"], "backend_unavailable")
        self.assertEqual(result["errorCode"], "MPS_UNAVAILABLE")

    def test_missing_dependency_and_unsupported_platform_are_structured(self):
        missing = probe_python_mps_execution(
            import_module=lambda name: (_ for _ in ()).throw(ModuleNotFoundError(name)),
            platform_name="darwin",
        )
        unsupported = probe_python_mps_execution(platform_name="windows")

        self.assertEqual(missing["status"], "dependency_missing")
        self.assertEqual(missing["errorType"], "ModuleNotFoundError")
        self.assertEqual(unsupported["status"], "unsupported")


if __name__ == "__main__":
    unittest.main()
