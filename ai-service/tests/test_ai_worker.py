import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import json
import unittest
import time
import urllib.request
import urllib.error

from core.task_queue import TaskQueue
from core.model_manager import ModelManager
from workers.prompt_worker import PromptWorker
from workers.analysis_worker import AnalysisWorker

class TestAIWorkerStability(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.queue = TaskQueue()
        self.manager = ModelManager()
        # Reset queue and loaded models
        self.queue.tasks.clear()
        self.manager.loaded_models.clear()

        # Create dummy image file for test execution
        with open("mock.jpg", "wb") as f:
            f.write(b"dummy image content")

        # Save original load methods to prevent side effects in other tests
        from models.wd_tagger import WDTaggerModel
        from models.florence2_tagger import Florence2TaggerModel
        self.orig_wd_load = WDTaggerModel.load
        self.orig_florence_load = Florence2TaggerModel.load

        # QwenVL will naturally route through the mocked urlopen below

        # Mock urllib.request.urlopen to avoid real network calls during tests
        class MockResponse:
            def __init__(self, data: bytes):
                self.data = data
            def read(self):
                return self.data
            def __enter__(self):
                return self
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
                
        def mock_urlopen(req, *args, **kwargs):
            url = req.full_url if hasattr(req, "full_url") else str(req)
            if "chat/completions" in url:
                body = req.data.decode("utf-8")
                if "style_tags" in body:
                    content = {
                        "choices": [{
                            "message": {
                                "content": json.dumps({
                                    "result_prompt": "A beautiful flat design illustration",
                                    "result_caption": "一个精美插图",
                                    "style_tags": ["flat design"]
                                })
                            }
                        }]
                    }
                else:
                    content = {
                        "choices": [{
                            "message": {
                                "content": json.dumps({
                                    "ocr_text": "面包烘焙",
                                    "text_blocks": [{"text": "面包烘焙", "box": [100, 100, 200, 300]}],
                                    "layout_analysis": "居中排版",
                                    "design_type": "commercial_poster",
                                    "visual_hierarchy": ["标题"],
                                    "text_tags": [{"name": "面包", "confidence": 0.95}],
                                    "design_tags": [{"name": "海报", "confidence": 0.88}],
                                    "evidence": ["overlays"]
                                })
                            }
                        }]
                    }
                return MockResponse(json.dumps(content).encode("utf-8"))
            elif "models" in url:
                content = {
                    "data": [{"id": "qwen3-vl-instruct-mock"}]
                }
                return MockResponse(json.dumps(content).encode("utf-8"))
            raise urllib.error.URLError("Mock URL not handled")
            
        self.orig_urlopen = urllib.request.urlopen
        urllib.request.urlopen = mock_urlopen

    async def asyncTearDown(self):
        urllib.request.urlopen = self.orig_urlopen
        if os.path.exists("mock.jpg"):
            os.remove("mock.jpg")
        from models.wd_tagger import WDTaggerModel
        from models.florence2_tagger import Florence2TaggerModel
        WDTaggerModel.load = self.orig_wd_load
        Florence2TaggerModel.load = self.orig_florence_load

    async def test_mutual_exclusion_heavy_models(self):
        print("\n--- Test: Mutual Exclusion and Eviction of Light Models ---")
        # Pre-load taggers
        # Since taggers may raise import errors depending on the host packages, we mock their load methods
        from models.wd_tagger import WDTaggerModel
        from models.florence2_tagger import Florence2TaggerModel
        WDTaggerModel.load = lambda self: setattr(self, "is_loaded", True)
        Florence2TaggerModel.load = lambda self: setattr(self, "is_loaded", True)

        await self.manager.load_model("wd_tagger")
        await self.manager.load_model("florence2")
        self.assertIn("wd_tagger", self.manager.loaded_models)
        self.assertIn("florence2", self.manager.loaded_models)

        # Loading Qwen-VL should evict wd_tagger and florence2
        await self.manager.load_model("qwen_vl")
        self.assertIn("qwen_vl", self.manager.loaded_models)
        self.assertNotIn("wd_tagger", self.manager.loaded_models)
        self.assertNotIn("florence2", self.manager.loaded_models)
        print("Qwen-VL loaded successfully, light models evicted automatically.")

    async def test_unload_rejection_when_task_running(self):
        print("\n--- Test: Unload Rejection when Task is Running ---")
        # 1. Create a dummy task that is active
        task_id = "test-task-1"
        self.queue.enqueue(
            task_id=task_id,
            asset_id="asset-123",
            file_path="mock.jpg",
            model_name="qwen2.5-vl-7b"
        )
        self.queue.update_task_status(task_id, "running")
        
        # 2. Load the model
        await self.manager.load_model("qwen_vl")
        self.assertIn("qwen_vl", self.manager.loaded_models)

        # 3. Try to unload the model - it should be rejected because task is running!
        result = await self.manager.unload_model("qwen_vl")
        self.assertFalse(result, "Unload should be rejected while task is running")
        self.assertIn("qwen_vl", self.manager.loaded_models)
        print("Unload rejected successfully to prevent interruption.")

        # 4. Finish the task and try to unload again - it should succeed!
        self.queue.update_task_status(task_id, "completed")
        result = await self.manager.unload_model("qwen_vl")
        self.assertTrue(result, "Unload should succeed after task completes")
        self.assertNotIn("qwen_vl", self.manager.loaded_models)
        print("Unload succeeded after task completed.")

    async def test_keepalive_countdown_after_completion(self):
        print("\n--- Test: KeepAlive Countdown starts after Completion ---")
        # 1. Load a model
        await self.manager.load_model("qwen_vl")
        initial_load_time = self.manager.loaded_models["qwen_vl"]["loaded_at"]

        # 2. Wait a brief moment and touch model (as worker does upon completion)
        await asyncio.sleep(0.5)
        self.manager.touch_model("qwen_vl")
        refreshed_time = self.manager.loaded_models["qwen_vl"]["loaded_at"]

        self.assertGreater(refreshed_time, initial_load_time, "KeepAlive timer loaded_at should be refreshed after completion")
        print("KeepAlive timer successfully refreshed after task completion.")

    async def test_qwen_vl_senior_analysis(self):
        print("\n--- Test: Qwen-VL Senior Analysis Structured Output ---")
        
        # Monkeypatch preprocess_image to bypass real file check
        import workers.analysis_worker
        orig_preprocess = workers.analysis_worker.preprocess_image
        workers.analysis_worker.preprocess_image = lambda path: {"width": 100, "height": 100}
        
        try:
            # 1. Create a manual analysis task
            task_id = "test-analysis-1"
            self.queue.enqueue(
                task_id=task_id,
                asset_id="asset-analysis-123",
                file_path="mock.jpg",
                model_name="Qwen2.5-VL"
            )
            
            # 2. Run analysis task using AnalysisWorker
            worker = AnalysisWorker()
            await worker.run_analysis_task(task_id)
            
            # 3. Check status and results
            task = self.queue.get_task(task_id)
            self.assertEqual(task["status"], "completed")
            self.assertIsNotNone(task["result"])
            
            res = task["result"]
            self.assertIn("ocr_text", res)
            self.assertIn("layout_analysis", res)
            self.assertIn("design_type", res)
            self.assertIn("visual_hierarchy", res)
            self.assertIn("text_tags", res)
            self.assertIn("design_tags", res)
            self.assertIn("evidence", res)
            
            # Verify text_tags list structure
            for t in res["text_tags"]:
                self.assertIn("name", t)
                self.assertIn("confidence", t)
                
            print("Qwen-VL senior analysis worker run successfully verified.")
        finally:
            workers.analysis_worker.preprocess_image = orig_preprocess

if __name__ == "__main__":
    unittest.main()
