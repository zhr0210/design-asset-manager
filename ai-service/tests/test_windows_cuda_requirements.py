import unittest
from pathlib import Path

from packaging.requirements import Requirement


REQUIREMENTS_PATH = Path(__file__).resolve().parents[1] / "requirements.txt"


def selected_requirements(platform_system):
    selected = []
    for raw_line in REQUIREMENTS_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        requirement = Requirement(line)
        if requirement.marker is None or requirement.marker.evaluate(
            {"platform_system": platform_system}
        ):
            selected.append(requirement)
    return selected


class TestWindowsCudaRequirements(unittest.TestCase):
    def test_windows_selects_gpu_onnx_runtime(self):
        requirements = selected_requirements("Windows")
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

    def test_non_windows_keeps_cpu_onnx_runtime(self):
        for platform_system in ("Darwin", "Linux"):
            with self.subTest(platform_system=platform_system):
                requirements = selected_requirements(platform_system)
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


if __name__ == "__main__":
    unittest.main()
