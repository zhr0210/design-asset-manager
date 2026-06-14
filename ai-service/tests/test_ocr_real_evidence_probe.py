import unittest

from core.ocr_real_evidence_probe import probe_ocr_real_evidence


class OcrRealEvidenceProbeTest(unittest.TestCase):
    def test_promotes_only_finite_generated_image_inference(self):
        result = probe_ocr_real_evidence(
            rapidocr_runner=lambda _path: {
                "status": "loaded_real",
                "boxCount": 2,
                "resultFinite": True,
            },
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "loaded_real")
        self.assertEqual(result["provider"], "rapidocr")
        self.assertEqual(result["operation"], "generated_image_text_detection")
        self.assertTrue(result["generatedFixture"])
        self.assertFalse(result["downloadsAllowed"])
        self.assertEqual(result["boxCount"], 2)
        self.assertRegex(result["checkedAt"], r"^\d{4}-\d{2}-\d{2}T")

    def test_falls_back_to_easyocr_without_promoting_failed_rapidocr(self):
        result = probe_ocr_real_evidence(
            rapidocr_runner=lambda _path: {
                "status": "dependency_missing",
                "errorCode": "RAPIDOCR_DEPENDENCY_MISSING",
            },
            easyocr_runner=lambda _path: {
                "status": "loaded_real",
                "boxCount": 1,
                "resultFinite": True,
            },
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "easyocr")
        self.assertEqual(len(result["attempts"]), 2)

    def test_reports_artifact_missing_without_paths_or_downloads(self):
        result = probe_ocr_real_evidence(
            rapidocr_runner=lambda _path: {
                "status": "dependency_missing",
                "errorCode": "RAPIDOCR_DEPENDENCY_MISSING",
            },
            easyocr_runner=lambda _path: {
                "status": "artifact_missing",
                "errorCode": "EASYOCR_MODEL_ARTIFACT_MISSING",
                "detail": "private path must not escape",
            },
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "artifact_missing")
        self.assertEqual(result["errorCode"], "OCR_MODEL_ARTIFACT_MISSING")
        self.assertNotIn("private path", str(result))

    def test_rejects_unknown_provider(self):
        with self.assertRaises(ValueError):
            probe_ocr_real_evidence("unknown")


if __name__ == "__main__":
    unittest.main()
