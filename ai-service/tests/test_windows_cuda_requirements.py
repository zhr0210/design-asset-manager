import unittest
from pathlib import Path

from packaging.requirements import Requirement


REQUIREMENTS_PATH = Path(__file__).resolve().parents[1] / "requirements.txt"
CUDA_REQUIREMENTS_PATH = (
    Path(__file__).resolve().parents[1] / "requirements-windows-cuda.txt"
)


def load_requirements(path):
    selected = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("-r "):
            selected.extend(load_requirements(path.parent / line[3:].strip()))
            continue
        requirement = Requirement(line)
        selected.append(requirement)
    return selected


class TestWindowsCudaRequirements(unittest.TestCase):
    def test_default_requirements_are_cpu_safe_on_every_platform(self):
        requirements = load_requirements(REQUIREMENTS_PATH)
        names = {requirement.name for requirement in requirements}
        optimum = next(
            requirement
            for requirement in requirements
            if requirement.name == "optimum"
        )

        self.assertIn("onnxruntime", names)
        self.assertNotIn("onnxruntime-gpu", names)
        self.assertIn("onnxruntime", optimum.extras)
        self.assertNotIn("onnxruntime-gpu", optimum.extras)

    def test_windows_cuda_profile_selects_gpu_onnx_runtime(self):
        requirements = load_requirements(CUDA_REQUIREMENTS_PATH)
        names = {requirement.name for requirement in requirements}
        optimum = next(
            requirement
            for requirement in requirements
            if requirement.name == "optimum"
        )

        self.assertIn("onnxruntime-gpu", names)
        self.assertNotIn("onnxruntime", names)
        self.assertIn("onnxruntime-gpu", optimum.extras)
        self.assertNotIn("onnxruntime", optimum.extras)


if __name__ == "__main__":
    unittest.main()
