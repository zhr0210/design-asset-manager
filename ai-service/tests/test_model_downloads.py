import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path
import tempfile
import shutil

# Add parent dir to path so we can import tools
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import tools.download_hf_model as download_hf_model
import tools.download_cooperative_hf_model as download_cooperative_hf_model

class MockResponse:
    def __init__(self, data, status=200, headers=None):
        self.data = data
        self.status = status
        self.headers = headers or {}
        self.offset = 0

    def read(self, amt=-1):
        if self.offset >= len(self.data):
            return b""
        if amt < 0:
            chunk = self.data[self.offset:]
            self.offset = len(self.data)
            return chunk
        else:
            chunk = self.data[self.offset:self.offset+amt]
            self.offset += amt
            return chunk

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

class TestModelDownloads(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.dest_path = Path(self.test_dir) / "test_model.bin"

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_mirror_switching_hf_model(self):
        # Test that args.mirror sets HF_ENDPOINT in download_hf_model
        with patch("sys.argv", ["download_hf_model.py", "--repo-id", "test-repo", "--local-dir", self.test_dir, "--mirror", "https://hf-mirror.com"]):
            # Mock huggingface_hub module in sys.modules to avoid importing real package
            mock_hf_hub = MagicMock()
            mock_snapshot = MagicMock(return_value=self.test_dir)
            mock_hf_hub.snapshot_download = mock_snapshot

            with patch.dict("sys.modules", {"huggingface_hub": mock_hf_hub}):
                # Save original env
                orig_env = os.environ.get("HF_ENDPOINT")
                try:
                    download_hf_model.main()
                    self.assertEqual(os.environ.get("HF_ENDPOINT"), "https://hf-mirror.com")
                finally:
                    if orig_env is not None:
                        os.environ["HF_ENDPOINT"] = orig_env
                    else:
                        os.environ.pop("HF_ENDPOINT", None)

    def test_mirror_switching_cooperative_hf_model(self):
        # Save original HF_RESOLVE
        orig_resolve = download_cooperative_hf_model.HF_RESOLVE
        try:
            with patch("sys.argv", ["download_cooperative_hf_model.py", "--repo-id", "test-repo", "--local-dir", self.test_dir, "--mirror", "https://hf-mirror.com", "--category", "pth"]):
                # Mock download_file
                with patch("tools.download_cooperative_hf_model.download_file", return_value=True) as mock_download_file:
                    download_cooperative_hf_model.main()
                    self.assertTrue(download_cooperative_hf_model.HF_RESOLVE.startswith("https://hf-mirror.com"))
        finally:
            download_cooperative_hf_model.HF_RESOLVE = orig_resolve

    def test_cooperative_model_family_download_uses_local_dir(self):
        local_dir = Path(self.test_dir) / "wd-vit-tagger-v3"
        destinations = []

        def mock_download_file(repo_id, filename, dest, ctx, num_channels=4):
            destinations.append(Path(dest))
            return True

        with patch("sys.argv", [
            "download_cooperative_hf_model.py",
            "--repo-id", "SmilingWolf/wd-vit-tagger-v3",
            "--local-dir", str(local_dir),
            "--category", "onnx-csv",
            "--model-family", "wd_tagger",
        ]):
            with patch("tools.download_cooperative_hf_model.download_file", side_effect=mock_download_file):
                download_cooperative_hf_model.main()

        self.assertEqual(
            sorted(path.name for path in destinations),
            ["model.onnx", "selected_tags.csv"],
        )
        self.assertTrue(all(path.parent == local_dir.resolve() for path in destinations))

    def test_stream_chunking_and_resume_on_failure(self):
        url = "https://huggingface.co/test-repo/resolve/main/test_model.bin"
        ctx = download_cooperative_hf_model.create_ssl_context()

        # Scenario 1: Fresh download, no partial file.
        # Ensure it reads in chunks. We will track calls to read().
        file_data = b"A" * 130000  # More than 2 * 64KB chunks
        mock_resp = MockResponse(file_data, status=200, headers={"Content-Length": str(len(file_data))})

        with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
            success = download_cooperative_hf_model.download_stream_single(url, self.dest_path, ctx, expected_size=len(file_data))
            self.assertTrue(success)
            self.assertTrue(self.dest_path.exists())
            self.assertEqual(self.dest_path.stat().st_size, len(file_data))
            self.assertEqual(self.dest_path.read_bytes(), file_data)

        # Scenario 2: Resume-on-failure.
        # Create a partial file with 60000 bytes.
        part_path = Path(self.test_dir) / "test_model.bin.part"
        part_path.write_bytes(b"A" * 60000)

        remaining_data = b"B" * 70000
        mock_resp_resume = MockResponse(remaining_data, status=206, headers={"Content-Length": str(len(remaining_data))})

        requested_headers = {}
        def mock_urlopen_capture(req, *args, **kwargs):
            nonlocal requested_headers
            requested_headers = req.headers
            return mock_resp_resume

        with patch("urllib.request.urlopen", side_effect=mock_urlopen_capture) as mock_urlopen:
            success = download_cooperative_hf_model.download_stream_single(url, self.dest_path, ctx, expected_size=130000)
            self.assertTrue(success)
            self.assertTrue(self.dest_path.exists())
            # Verify range header was sent
            self.assertEqual(requested_headers.get("Range"), "bytes=60000-")
            # Combined file should contain 60000 'A's and 70000 'B's
            final_content = self.dest_path.read_bytes()
            self.assertEqual(final_content[:60000], b"A" * 60000)
            self.assertEqual(final_content[60000:], b"B" * 70000)

    def test_parallel_downloading_segmented(self):
        url = "https://huggingface.co/test-repo/resolve/main/test_model.bin"
        ctx = download_cooperative_hf_model.create_ssl_context()

        total_size = 20 * 1024 * 1024  # 20MB, > 15MB
        num_channels = 4

        # Mock range support and total size
        with patch("tools.download_cooperative_hf_model.check_range_support", return_value=(True, total_size)):
            # Mock download_segment to write chunk data
            def mock_download_segment(url, dest, num_channels, index, start, end, ctx):
                segment_path = dest.parent / f"{dest.name}.part.{num_channels}.{index}.{start}_{end}"
                size = end - start + 1
                segment_path.write_bytes(bytes([index]) * size)
                return True

            with patch("tools.download_cooperative_hf_model.download_segment", side_effect=mock_download_segment):
                success = download_cooperative_hf_model.download_parallel(url, self.dest_path, total_size, num_channels, ctx)
                self.assertTrue(success)
                self.assertTrue(self.dest_path.exists())
                self.assertEqual(self.dest_path.stat().st_size, total_size)

                # Check merged parts
                content = self.dest_path.read_bytes()
                segment_size = (total_size + num_channels - 1) // num_channels
                self.assertEqual(content[0], 0)
                self.assertEqual(content[segment_size], 1)
                self.assertEqual(content[segment_size * 2], 2)
                self.assertEqual(content[segment_size * 3], 3)

    def test_downloader_resume_variable_channels(self):
        url = "https://huggingface.co/test-repo/resolve/main/test_model.bin"
        ctx = download_cooperative_hf_model.create_ssl_context()
        mock_resp = MockResponse(b"A" * 100, status=206)
        with patch("urllib.request.urlopen", return_value=mock_resp):
            success = download_cooperative_hf_model.download_segment(url, self.dest_path, 4, 0, 0, 99, ctx)
            self.assertTrue(success)
            expected_segment = self.dest_path.parent / f"{self.dest_path.name}.part.4.0.0_99"
            self.assertTrue(expected_segment.exists())
            self.assertEqual(expected_segment.read_bytes(), b"A" * 100)

    def test_commit_download_part_replaces_existing_target(self):
        part_path = Path(self.test_dir) / "test_model.bin.part"
        self.dest_path.write_bytes(b"stale")
        part_path.write_bytes(b"fresh")

        download_cooperative_hf_model.commit_download_part(part_path, self.dest_path)

        self.assertEqual(self.dest_path.read_bytes(), b"fresh")
        self.assertFalse(part_path.exists())

    def test_download_segment_fails_if_not_206(self):
        url = "https://huggingface.co/test-repo/resolve/main/test_model.bin"
        ctx = download_cooperative_hf_model.create_ssl_context()
        mock_resp = MockResponse(b"A" * 100, status=200)  # status 200 instead of 206
        with patch("urllib.request.urlopen", return_value=mock_resp):
            success = download_cooperative_hf_model.download_segment(url, self.dest_path, 4, 0, 0, 99, ctx)
            self.assertFalse(success)
            expected_segment = self.dest_path.parent / f"{self.dest_path.name}.part.4.0.0_99"
            self.assertFalse(expected_segment.exists())

    def test_parallel_downloading_fallback(self):
        url = "https://huggingface.co/test-repo/resolve/main/test_model.bin"
        ctx = download_cooperative_hf_model.create_ssl_context()

        # When range is not supported, it should fall back to download_stream_single
        with patch("tools.download_cooperative_hf_model.check_range_support", return_value=(False, 100000)):
            def mock_single_impl(url, dest, ctx, expected_size=None):
                dest.write_bytes(b"A" * 100)
                return True
            with patch("tools.download_cooperative_hf_model.download_stream_single", side_effect=mock_single_impl) as mock_single:
                success = download_cooperative_hf_model.download_file("test-repo", "test_model.bin", self.dest_path, ctx)
                self.assertTrue(success)
                mock_single.assert_called_once()

    def test_validate_file(self):
        # 1. Non-existent file
        self.assertFalse(download_cooperative_hf_model.validate_file(self.dest_path, "model.onnx"))

        # 2. Existing but too small file (for model.onnx expected_min is 780MB)
        self.dest_path.write_bytes(b"A" * 1000)
        self.assertFalse(download_cooperative_hf_model.validate_file(self.dest_path, "model.onnx"))
        # Verify file got unlinked
        self.assertFalse(self.dest_path.exists())

        # 3. Existing but < 100 bytes (for config.json which has no expected_min)
        config_path = Path(self.test_dir) / "config.json"
        config_path.write_bytes(b"A" * 50)
        self.assertFalse(download_cooperative_hf_model.validate_file(config_path, "config.json"))
        self.assertFalse(config_path.exists())

        # 4. Valid non-json file
        non_json_path = Path(self.test_dir) / "some_file.txt"
        non_json_path.write_bytes(b"A" * 200)
        self.assertTrue(download_cooperative_hf_model.validate_file(non_json_path, "some_file.txt"))

        # 5. Valid JSON file
        config_path.write_bytes(b'{"valid": true, "extra": "' + b'A' * 100 + b'"}')
        self.assertTrue(download_cooperative_hf_model.validate_file(config_path, "config.json"))

        # 6. Invalid JSON file
        config_path.write_bytes(b"A" * 200)
        self.assertFalse(download_cooperative_hf_model.validate_file(config_path, "config.json"))
        self.assertFalse(config_path.exists())

if __name__ == "__main__":
    unittest.main()
