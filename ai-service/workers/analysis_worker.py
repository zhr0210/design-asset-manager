import asyncio
from core.task_queue import TaskQueue
from core.model_manager import ModelManager
from models.qwen_vl import QwenVL
from utils.image_preprocess import preprocess_image

class AnalysisWorker:
    def __init__(self):
        self.queue = TaskQueue()
        self.model_manager = ModelManager()

    async def run_analysis_task(self, task_id: str) -> None:
        """Asynchronously processes a manual design analysis task using Qwen3-VL."""
        task = self.queue.get_task(task_id)
        if not task:
            return

        self.queue.update_task_status(task_id, "running")
        print(f"[AnalysisWorker] Processing manual design analysis task {task_id}...")

        try:
            # 1. Acquire lock and load Qwen-VL
            async with self.model_manager.manual_model_lock:
                await self.model_manager.load_model("qwen_vl")

                # Verify image integrity
                preprocess_image(task["file_path"])

                # Invoke Qwen-VL design analysis
                qwen_vl = QwenVL()
                res = qwen_vl.analyze_design(task["file_path"])

                # Complete task
                self.queue.update_task_status(task_id, "completed", result=res)
                print(f"[AnalysisWorker] Analysis task {task_id} completed successfully.")

        except Exception as e:
            print(f"[AnalysisWorker] Analysis task {task_id} failed: {e}")
            self.queue.update_task_status(task_id, "failed", error_message=str(e))
        finally:
            self.model_manager.touch_model("qwen_vl")
