from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from models.clip_design_classifier import CLIPDesignClassifier
from models.florence2_tagger import Florence2TaggerModel
from models.wd_tagger import WDTaggerModel
from ocr_workers.easyocr_color_worker import create_local_easyocr_reader
from ocr_workers.paddleocr_color_worker import create_local_paddleocr_engine
from prompt_workers import qwen3vl_prompt_worker
from services.translation_service import TranslationService


class _LoadedModel:
    def to(self, _device):
        return self


def _cpu_torch_module() -> types.ModuleType:
    module = types.ModuleType("torch")
    module.__version__ = "test"
    module.float16 = "float16"
    module.float32 = "float32"
    module.bfloat16 = "bfloat16"
    module.cuda = types.SimpleNamespace(is_available=lambda: False)
    module.backends = types.SimpleNamespace(
        mps=types.SimpleNamespace(is_available=lambda: False)
    )
    return module


class TestLocalOnlyModelLoading(unittest.TestCase):
    def setUp(self):
        self._strict = os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        self._allow_mock = os.environ.get("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI")
        os.environ["DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI"] = "1"

    def tearDown(self):
        if self._strict is not None:
            os.environ["DESIGN_ASSET_MANAGER_STRICT_REAL_AI"] = self._strict
        else:
            os.environ.pop("DESIGN_ASSET_MANAGER_STRICT_REAL_AI", None)
        if self._allow_mock is None:
            os.environ.pop("DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI", None)
        else:
            os.environ["DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI"] = self._allow_mock

    def test_translation_loader_can_only_resolve_an_existing_local_cache(self):
        calls: list[tuple[str, dict]] = []

        class _LocalOnlyLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append((source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote model acquisition was attempted")
                return _LoadedModel()

        transformers = types.ModuleType("transformers")
        transformers.MarianTokenizer = _LocalOnlyLoader
        transformers.MarianMTModel = _LocalOnlyLoader

        with patch.dict(
            sys.modules,
            {"transformers": transformers, "torch": _cpu_torch_module()},
        ):
            service = TranslationService()
            service.load()

        self.assertTrue(service.is_loaded)
        self.assertFalse(service.is_mock)
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(kwargs["local_files_only"] for _, kwargs in calls))

    def test_clip_loader_uses_only_the_supplied_local_directory(self):
        calls: list[tuple[str, str, dict]] = []

        class _LocalOnlyModelLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append(("model", source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote model acquisition was attempted")
                return _LoadedModel()

        class _LocalOnlyProcessorLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append(("processor", source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote processor acquisition was attempted")
                return object()

        transformers = types.ModuleType("transformers")
        transformers.CLIPModel = _LocalOnlyModelLoader
        transformers.CLIPProcessor = _LocalOnlyProcessorLoader

        with tempfile.TemporaryDirectory() as model_dir, patch.dict(
            sys.modules,
            {"transformers": transformers, "torch": _cpu_torch_module()},
        ), patch("importlib.util.find_spec", return_value=object()):
            model = CLIPDesignClassifier(local_path=model_dir)
            model.load()

        self.assertEqual(model.state, "loaded_real")
        self.assertEqual([kind for kind, _, _ in calls], ["model", "processor"])
        self.assertTrue(all(source == model_dir for _, source, _ in calls))
        self.assertTrue(all(kwargs["local_files_only"] for _, _, kwargs in calls))

    def test_florence_loader_uses_only_the_supplied_local_directory(self):
        calls: list[tuple[str, str, dict]] = []

        class _LocalOnlyModelLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append(("model", source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote model acquisition was attempted")
                return _LoadedModel()

        class _LocalOnlyProcessorLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append(("processor", source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote processor acquisition was attempted")
                return object()

        transformers = types.ModuleType("transformers")
        transformers.AutoModelForCausalLM = _LocalOnlyModelLoader
        transformers.AutoProcessor = _LocalOnlyProcessorLoader

        with tempfile.TemporaryDirectory() as model_dir, patch.dict(
            sys.modules,
            {"transformers": transformers, "torch": _cpu_torch_module()},
        ), patch("importlib.util.find_spec", return_value=object()):
            model = Florence2TaggerModel(local_path=model_dir)
            model.load()

        self.assertEqual(model.state, "loaded_real")
        self.assertEqual([kind for kind, _, _ in calls], ["model", "processor"])
        self.assertTrue(all(source == model_dir for _, source, _ in calls))
        self.assertTrue(all(kwargs["local_files_only"] for _, _, kwargs in calls))

    def test_wd_tagger_missing_support_files_never_calls_hugging_face(self):
        forbidden_download = Mock(side_effect=AssertionError("network download attempted"))

        with tempfile.TemporaryDirectory() as test_root:
            missing_model_dir = Path(test_root) / "missing-wd-model"
            with patch(
                "importlib.util.find_spec", return_value=object()
            ), patch("huggingface_hub.hf_hub_download", forbidden_download):
                model = WDTaggerModel()
                model.cache_dir = str(missing_model_dir)
                model.load()
            self.assertFalse(missing_model_dir.exists())

        forbidden_download.assert_not_called()
        self.assertTrue(model.is_loaded)
        self.assertTrue(model.is_mock)

    def test_easyocr_reader_disables_model_downloads(self):
        reader = Mock(return_value=object())
        easyocr_module = types.SimpleNamespace(Reader=reader)

        with self.assertRaisesRegex(FileNotFoundError, "Local EasyOCR model files unavailable"):
            create_local_easyocr_reader(easyocr_module, ["ch_sim", "en"], False, {})
        reader.assert_not_called()

        with tempfile.TemporaryDirectory() as test_root:
            model_dir = Path(test_root) / "model"
            model_dir.mkdir()
            (model_dir / "existing-model.bin").touch()
            create_local_easyocr_reader(
                easyocr_module,
                ["ch_sim", "en"],
                False,
                {"EASYOCR_MODULE_PATH": test_root},
            )

        reader.assert_called_once_with(
            ["ch_sim", "en"],
            gpu=False,
            download_enabled=False,
            verbose=False,
            model_storage_directory=str(model_dir),
        )

    def test_paddleocr_fails_closed_until_a_versioned_local_adapter_exists(self):
        constructor = Mock(return_value=object())
        with self.assertRaisesRegex(RuntimeError, "PADDLEOCR_LOCAL_ONLY_ADAPTER_UNAVAILABLE"):
            create_local_paddleocr_engine(constructor, {})
        constructor.assert_not_called()

    def test_qwen_prompt_worker_passes_local_only_to_model_and_processor(self):
        calls: list[tuple[str, str, dict]] = []

        class _LocalOnlyModelLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append(("model", source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote model acquisition was attempted")
                return object()

        class _LocalOnlyProcessorLoader:
            @classmethod
            def from_pretrained(cls, source, **kwargs):
                calls.append(("processor", source, kwargs))
                if kwargs.get("local_files_only") is not True:
                    raise AssertionError("remote processor acquisition was attempted")
                raise RuntimeError("stop after local-only loader verification")

        transformers = types.ModuleType("transformers")
        transformers.__version__ = "test"
        transformers.AutoModelForVision2Seq = _LocalOnlyModelLoader
        transformers.AutoProcessor = _LocalOnlyProcessorLoader
        qwen_utils = types.ModuleType("qwen_vl_utils")
        qwen_utils.process_vision_info = lambda _messages: ([], [])

        with tempfile.TemporaryDirectory() as model_dir:
            image_path = Path(model_dir) / "fixture.png"
            image_path.touch()
            payload = {
                "imagePath": str(image_path),
                "modelPath": model_dir,
                "modelId": "local-fixture",
            }
            with patch.dict(
                sys.modules,
                {
                    "transformers": transformers,
                    "torch": _cpu_torch_module(),
                    "qwen_vl_utils": qwen_utils,
                },
            ), patch.object(sys, "stdin", io.StringIO(json.dumps(payload))), patch.object(
                qwen3vl_prompt_worker, "emit"
            ):
                with self.assertRaises(SystemExit):
                    qwen3vl_prompt_worker.main()

        self.assertEqual([kind for kind, _, _ in calls], ["model", "processor"])
        self.assertTrue(all(source == model_dir for _, source, _ in calls))
        self.assertTrue(all(kwargs["local_files_only"] for _, _, kwargs in calls))

    def test_qwen_prompt_worker_never_rewrites_a_local_model_config(self):
        class _UnexpectedLoader:
            @classmethod
            def from_pretrained(cls, _source, **_kwargs):
                raise AssertionError("model loading must stop at the read-only config check")

        transformers = types.ModuleType("transformers")
        transformers.__version__ = "test"
        transformers.AutoModelForVision2Seq = _UnexpectedLoader
        transformers.AutoProcessor = _UnexpectedLoader
        qwen_utils = types.ModuleType("qwen_vl_utils")
        qwen_utils.process_vision_info = lambda _messages: ([], [])
        emitted: list[dict] = []

        with tempfile.TemporaryDirectory() as model_dir:
            image_path = Path(model_dir) / "fixture.png"
            image_path.touch()
            config_path = Path(model_dir) / "config.json"
            original_config = (
                b'{"quantization_config":{"ignore":[]},"model_type":"qwen3_vl"}\n'
            )
            config_path.write_bytes(original_config)
            payload = {
                "imagePath": str(image_path),
                "modelPath": model_dir,
                "modelId": "local-fixture",
                "quantization": "awq-4bit",
            }

            with patch.dict(
                sys.modules,
                {
                    "transformers": transformers,
                    "torch": _cpu_torch_module(),
                    "qwen_vl_utils": qwen_utils,
                },
            ), patch.object(sys, "stdin", io.StringIO(json.dumps(payload))), patch.object(
                qwen3vl_prompt_worker,
                "emit",
                side_effect=emitted.append,
            ):
                with self.assertRaises(SystemExit):
                    qwen3vl_prompt_worker.main()

            self.assertEqual(config_path.read_bytes(), original_config)

        self.assertEqual(emitted[-1]["error"]["code"], "MODEL_CONFIG_REQUIRES_MIGRATION")


if __name__ == "__main__":
    unittest.main()
