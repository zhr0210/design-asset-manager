import asyncio
from core.task_queue import TaskQueue
from workers.tag_worker import TagWorker

class BatchScheduler:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(BatchScheduler, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        self.queue = TaskQueue()
        self.tag_worker = TagWorker()
        
        # Batch Scheduler configurations conforming to specification
        self.batch_size = 8
        self.max_batch_size = 16
        self.min_batch_size = 4
        self.wait_for_batch_ms = 3000
        
        self.threshold = self.min_batch_size # Auto-trigger if min_batch_size or more tasks exist
        self.running = False
        self._scheduler_task = None

    def start(self):
        """Starts the scheduler loop and tag worker background thread."""
        if self.running:
            return
        self.running = True
        self.tag_worker.start()
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        print(f"[BatchScheduler] Periodic queue monitor started (Threshold: {self.threshold}).")

    def stop(self):
        """Stops the scheduler and tag worker."""
        if not self.running:
            return
        self.running = False
        self.tag_worker.stop()
        if self._scheduler_task:
            self._scheduler_task.cancel()
        print("[BatchScheduler] Queue monitor stopped.")

    async def trigger_batch_now(self) -> int:
        """Manually triggers immediate processing of all waiting tagging tasks."""
        waiting_count = len([
            t for t in self.queue.tasks.values() 
            if t["status"] == "queued" and "tag" in t["task_id"]
        ])
        
        if waiting_count > 0:
            print(f"[BatchScheduler] Manual batch processing triggered for {waiting_count} waiting tasks.")
            # Ensure tag worker is running
            if not self.tag_worker.running:
                self.tag_worker.start()
        return waiting_count

    async def _scheduler_loop(self):
        while self.running:
            try:
                # Periodic checks every 5 seconds
                await asyncio.sleep(5.0)
                
                # Count waiting jobs
                waiting_count = len([
                    t for t in self.queue.tasks.values() 
                    if t["status"] == "queued" and "tag" in t["task_id"]
                ])

                if waiting_count >= self.threshold:
                    print(f"[BatchScheduler] Queue size ({waiting_count}) exceeded threshold ({self.threshold}). Auto-triggering batch runs...")
                    await self.trigger_batch_now()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[BatchScheduler] Error in monitor loop: {e}")
