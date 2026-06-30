import os
import sys
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.cuda_execution_probe import probe_python_cuda_execution


class TestCudaExecutionProbe(unittest.TestCase):
    def test_real_execution_returns_sanitized_evidence(self):
        torch = types.SimpleNamespace(
            cuda=types.SimpleNamespace(is_available=lambda: True)
        )
        result = probe_python_cuda_execution(
            import_module=lambda name: torch,
            platform_name="windows",
            execute_probe=lambda module: 30.0,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "executed_real")
        self.assertEqual(result["runtime"], "torch.cuda")
        self.assertTrue(result["resultFinite"])

    def test_unavailable_backend_is_not_execution_failure(self):
        torch = types.SimpleNamespace(
            cuda=types.SimpleNamespace(is_available=lambda: False)
        )
        result = probe_python_cuda_execution(
            import_module=lambda name: torch,
            platform_name="windows",
        )

        self.assertEqual(result["status"], "backend_unavailable")
        self.assertEqual(result["errorCode"], "CUDA_UNAVAILABLE")

    def test_missing_dependency_and_unsupported_platform_are_structured(self):
        missing = probe_python_cuda_execution(
            import_module=lambda name: (_ for _ in ()).throw(ModuleNotFoundError(name)),
            platform_name="windows",
        )
        unsupported = probe_python_cuda_execution(platform_name="darwin")

        self.assertEqual(missing["status"], "dependency_missing")
        self.assertEqual(missing["errorType"], "ModuleNotFoundError")
        self.assertEqual(unsupported["status"], "unsupported")

    def test_execution_failure_is_caught_and_reported(self):
        torch = types.SimpleNamespace(
            cuda=types.SimpleNamespace(is_available=lambda: True)
        )
        def bad_probe(module):
            raise RuntimeError("Out of memory")

        result = probe_python_cuda_execution(
            import_module=lambda name: torch,
            platform_name="windows",
            execute_probe=bad_probe,
        )
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "execution_failed")
        self.assertEqual(result["errorCode"], "CUDA_EXECUTION_FAILED")
        self.assertEqual(result["errorType"], "RuntimeError")


if __name__ == "__main__":
    unittest.main()
