#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check-forbidden-paths.py"


def load_module():
    spec = importlib.util.spec_from_file_location("check_forbidden_paths", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load check-forbidden-paths.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CheckForbiddenPathsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.module = load_module()
        self.config = {
            "forbidden_directories": [
                "docs/",
                "ai-service/models_cache/",
                "dist-packages/",
                "dist-temp/",
                "runtime-data/",
            ]
        }

    def test_docs_changes_are_advisory(self) -> None:
        findings = self.module.collect_findings(
            ["docs/platform/RUNTIME_PACKAGE_EXECUTOR.md"],
            self.config,
        )

        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].reason, "docs/")
        self.assertEqual(findings[0].severity, "advisory")

    def test_sensitive_directories_are_blocking(self) -> None:
        findings = self.module.collect_findings(
            [
                "dist-temp/package-smoke/report.json",
                "runtime-data/app.sqlite",
                "ai-service/models_cache/model.onnx",
            ],
            self.config,
        )

        self.assertEqual([finding.severity for finding in findings], ["blocking", "blocking", "blocking"])

    def test_model_and_database_suffixes_are_blocking(self) -> None:
        findings = self.module.collect_findings(
            [
                "fixtures/runtime/model.gguf",
                "fixtures/runtime/app.sqlite-wal",
            ],
            self.config,
        )

        self.assertEqual([finding.reason for finding in findings], [
            "large model weight or local SQLite database",
            "large model weight or local SQLite database",
        ])
        self.assertTrue(all(finding.severity == "blocking" for finding in findings))

    def test_mixed_docs_and_generated_paths_include_both_severities(self) -> None:
        findings = self.module.collect_findings(
            [
                "docs/platform/RELEASE_FLOW_GOVERNANCE.md",
                "dist-packages/release.json",
            ],
            self.config,
        )

        self.assertEqual([finding.severity for finding in findings], ["advisory", "blocking"])


if __name__ == "__main__":
    unittest.main()
