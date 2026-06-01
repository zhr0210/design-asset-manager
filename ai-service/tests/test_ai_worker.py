import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import sys
import unittest
import time

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

        # Monkeypatch QwenVLFallbackAnalyzer to force mock mode in unit tests
        from models.qwen_vl_fallback_analyzer import QwenVLFallbackAnalyzer
        def mock_load(instance_self):
            instance_self.is_mock = True
            instance_self.backend = "mock"
            instance_self.is_loaded = True
        QwenVLFallbackAnalyzer.load = mock_load

    async def test_mutual_exclusion_heavy_models(self):
        print("\n--- Test: Mutual Exclusion of Heavy Models (JoyCaption vs Qwen-VL) ---")
        # 1. Load JoyCaption
        await self.manager.load_model("joycaption")
        self.assertIn("joycaption", self.manager.loaded_models)
        self.assertNotIn("qwen_vl", self.manager.loaded_models)
        print("JoyCaption loaded successfully.")

        # 2. Load Qwen-VL, which should evict JoyCaption
        await self.manager.load_model("qwen_vl")
        self.assertIn("qwen_vl", self.manager.loaded_models)
        self.assertNotIn("joycaption", self.manager.loaded_models)
        print("Qwen-VL loaded successfully, JoyCaption evicted automatically.")

    async def test_unload_rejection_when_task_running(self):
        print("\n--- Test: Unload Rejection when Task is Running ---")
        # 1. Create a dummy task that is active
        task_id = "test-task-1"
        self.queue.enqueue(
            task_id=task_id,
            asset_id="asset-123",
            file_path="mock.jpg",
            model_name="JoyCaption-v2"
        )
        self.queue.update_task_status(task_id, "running")
        
        # 2. Load the model
        await self.manager.load_model("joycaption")
        self.assertIn("joycaption", self.manager.loaded_models)

        # 3. Try to unload the model - it should be rejected because task is running!
        result = await self.manager.unload_model("joycaption")
        self.assertFalse(result, "Unload should be rejected while task is running")
        self.assertIn("joycaption", self.manager.loaded_models)
        print("Unload rejected successfully to prevent interruption.")

        # 4. Finish the task and try to unload again - it should succeed!
        self.queue.update_task_status(task_id, "completed")
        result = await self.manager.unload_model("joycaption")
        self.assertTrue(result, "Unload should succeed after task completes")
        self.assertNotIn("joycaption", self.manager.loaded_models)
        print("Unload succeeded after task completed.")

    async def test_keepalive_countdown_after_completion(self):
        print("\n--- Test: KeepAlive Countdown starts after Completion ---")
        # 1. Load a model
        await self.manager.load_model("joycaption")
        initial_load_time = self.manager.loaded_models["joycaption"]["loaded_at"]

        # 2. Wait a brief moment and touch model (as worker does upon completion)
        await asyncio.sleep(0.5)
        self.manager.touch_model("joycaption")
        refreshed_time = self.manager.loaded_models["joycaption"]["loaded_at"]

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
