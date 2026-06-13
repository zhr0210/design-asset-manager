import os
import sys
import types
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.torch_inference_runtime import configure_torch_inference_runtime


def fake_torch(cuda_available=True):
    precision_calls = []
    matmul = types.SimpleNamespace(allow_tf32=False)
    cudnn = types.SimpleNamespace(allow_tf32=False, benchmark=False)
    torch = types.SimpleNamespace(
        cuda=types.SimpleNamespace(is_available=lambda: cuda_available),
        backends=types.SimpleNamespace(
            cuda=types.SimpleNamespace(matmul=matmul),
            cudnn=cudnn,
        ),
        set_float32_matmul_precision=precision_calls.append,
    )
    return torch, precision_calls, matmul, cudnn


class TestTorchInferenceRuntime(unittest.TestCase):
    def test_cuda_defaults_enable_tf32_without_variable_shape_autotune(self):
        torch, precision_calls, matmul, cudnn = fake_torch()

        result = configure_torch_inference_runtime(torch, env={})

        self.assertEqual(precision_calls, ["high"])
        self.assertTrue(matmul.allow_tf32)
        self.assertTrue(cudnn.allow_tf32)
        self.assertFalse(cudnn.benchmark)
        self.assertEqual(
            result,
            {
                "cuda_available": True,
                "tf32_enabled": True,
                "matmul_precision": "high",
                "cudnn_benchmark": False,
            },
        )

    def test_environment_can_restore_exact_matmul_and_enable_autotune(self):
        torch, precision_calls, matmul, cudnn = fake_torch()

        result = configure_torch_inference_runtime(
            torch,
            env={
                "DAM_CUDA_TF32": "0",
                "DAM_CUDNN_BENCHMARK": "1",
            },
        )

        self.assertEqual(precision_calls, ["highest"])
        self.assertFalse(matmul.allow_tf32)
        self.assertFalse(cudnn.allow_tf32)
        self.assertTrue(cudnn.benchmark)
        self.assertFalse(result["tf32_enabled"])
        self.assertTrue(result["cudnn_benchmark"])

    def test_cpu_runtime_remains_unchanged(self):
        torch, precision_calls, matmul, cudnn = fake_torch(cuda_available=False)

        result = configure_torch_inference_runtime(torch, env={})

        self.assertEqual(precision_calls, [])
        self.assertFalse(matmul.allow_tf32)
        self.assertFalse(cudnn.allow_tf32)
        self.assertFalse(cudnn.benchmark)
        self.assertFalse(result["cuda_available"])


if __name__ == "__main__":
    unittest.main()
