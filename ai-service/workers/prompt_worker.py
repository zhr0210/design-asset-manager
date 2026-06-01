import asyncio
from core.task_queue import TaskQueue
from core.model_manager import ModelManager
from models.joycaption import JoyCaption
from utils.image_preprocess import preprocess_image
from utils.prompt_formatter import format_prompt

class PromptWorker:
    def __init__(self):
        self.queue = TaskQueue()
        self.model_manager = ModelManager()

    async def run_prompt_task(self, task_id: str) -> None:
        """Asynchronously processes a manual prompt reversal task."""
        task = self.queue.get_task(task_id)
        if not task:
            return

        self.queue.update_task_status(task_id, "running")
        print(f"[PromptWorker] Processing manual prompt generation task {task_id}...")

        try:
            # 1. Acquire mutex/lock for manual heavy models and load JoyCaption
            async with self.model_manager.manual_model_lock:
                await self.model_manager.load_model("joycaption")

                # Verify image integrity
                preprocess_image(task["file_path"])

                # Invoke mock JoyCaption
                joy_caption = JoyCaption()
                
                # Simulate heavy inference latency (1.0s)
                await asyncio.sleep(1.0)
                res = joy_caption.generate_prompt(task["file_path"])

                # Format prompts
                res["result_prompt"] = format_prompt(res["result_prompt"])

                # Complete task
                self.queue.update_task_status(task_id, "completed", result=res)
                print(f"[PromptWorker] Prompt task {task_id} completed successfully.")

        except Exception as e:
            print(f"[PromptWorker] Prompt task {task_id} failed: {e}")
            self.queue.update_task_status(task_id, "failed", error_message=str(e))
        finally:
            self.model_manager.touch_model("joycaption")
