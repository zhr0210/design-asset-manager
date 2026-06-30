import time
import threading
import os
from typing import Dict, List, Any, Optional

class TaskQueue:
    _instance: Optional['TaskQueue'] = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(TaskQueue, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        self.lock = threading.Lock()
        
        # Dictionary mapping task_id -> task_dict
        self.tasks: Dict[str, Dict[str, Any]] = {}
        
        # Initialize SQLite tasks cache for persistent self-healing
        self._init_cache_db()
        
        self.load_queued_tasks_from_db()

    def _init_cache_db(self) -> None:
        import sqlite3
        default_cache_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "tasks_cache.db"
        )
        self.cache_db_path = os.path.expanduser(
            os.environ.get("DESIGN_ASSET_MANAGER_TASK_CACHE_DB", default_cache_path)
        )
        try:
            os.makedirs(os.path.dirname(self.cache_db_path), exist_ok=True)
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS task_results (
                    task_id TEXT PRIMARY KEY,
                    asset_id TEXT,
                    file_path TEXT,
                    status TEXT,
                    priority INTEGER,
                    model_name TEXT,
                    result_json TEXT,
                    error_message TEXT,
                    created_at REAL,
                    started_at REAL,
                    completed_at REAL
                )
            """)
            conn.commit()
            conn.close()
            print("[TaskQueue] Persistent task cache database initialized.")
        except Exception as e:
            print(f"[TaskQueue] Failed to initialize persistent tasks cache: {type(e).__name__}")

    def load_queued_tasks_from_db(self) -> None:
        """Loads any 'queued' tasks from the SQLite database into memory on startup."""
        import sqlite3
        if os.environ.get("DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS") == "1":
            return

        default_db_path = "~/DesignAssetManager/design_asset_manager.db"
        db_path = os.path.expanduser(
            os.environ.get("DESIGN_ASSET_MANAGER_RUNTIME_DB", default_db_path)
        )
        if not os.path.exists(db_path):
            return
            
        print("[TaskQueue] Restoring queued tasks from the runtime database.")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 1. Load Tag Tasks
            cursor.execute("SELECT id, asset_id, file_path, status, priority, model_name FROM ai_tag_tasks WHERE status = 'queued'")
            tag_count = 0
            for r in cursor.fetchall():
                task_id, asset_id, file_path, status, priority, model_name = r
                models_to_run = None
                if model_name and model_name.startswith("custom_pipeline:"):
                    models_to_run = model_name.replace("custom_pipeline:", "").split(",")
                self.tasks[task_id] = {
                    "task_id": task_id,
                    "asset_id": asset_id,
                    "file_path": file_path,
                    "status": "queued",
                    "priority": priority,
                    "model_name": model_name or "WD-Tagger-v3",
                    "models_to_run": models_to_run,
                    "retry_count": 0,
                    "error_message": None,
                    "result": None,
                    "created_at": time.time(),
                    "started_at": None,
                    "completed_at": None,
                    "cancelled_at": None
                }
                tag_count += 1
                
            # 2. Load Prompt Tasks
            cursor.execute("SELECT id, asset_id, file_path, status, model_name FROM ai_prompt_tasks WHERE status = 'queued'")
            prompt_count = 0
            for r in cursor.fetchall():
                task_id, asset_id, file_path, status, model_name = r
                self.tasks[task_id] = {
                    "task_id": task_id,
                    "asset_id": asset_id,
                    "file_path": file_path,
                    "status": "queued",
                    "priority": 10,
                    "model_name": model_name or "Qwen3-VL",
                    "retry_count": 0,
                    "error_message": None,
                    "result": None,
                    "created_at": time.time(),
                    "started_at": None,
                    "completed_at": None,
                    "cancelled_at": None
                }
                prompt_count += 1
                
            # 3. Load Analysis Tasks
            cursor.execute("SELECT id, asset_id, file_path, status, model_name FROM ai_analysis_tasks WHERE status = 'queued'")
            analysis_count = 0
            for r in cursor.fetchall():
                task_id, asset_id, file_path, status, model_name = r
                self.tasks[task_id] = {
                    "task_id": task_id,
                    "asset_id": asset_id,
                    "file_path": file_path,
                    "status": "queued",
                    "priority": 10,
                    "model_name": model_name or "Qwen2.5-VL",
                    "retry_count": 0,
                    "error_message": None,
                    "result": None,
                    "created_at": time.time(),
                    "started_at": None,
                    "completed_at": None,
                    "cancelled_at": None
                }
                analysis_count += 1
                
            print(f"[TaskQueue] Successfully restored {tag_count} tag tasks, {prompt_count} prompt tasks, {analysis_count} analysis tasks from SQLite!")
            conn.close()
        except Exception as e:
            print(f"[TaskQueue] Failed to restore queued tasks from SQLite: {type(e).__name__}")

    def enqueue(self, task_id: str, asset_id: str, file_path: str, model_name: str, priority: int = 0, models_to_run: Optional[List[str]] = None) -> Dict[str, Any]:
        """Insert new task into queue."""
        with self.lock:
            resolved_model_name = model_name
            if models_to_run:
                resolved_model_name = f"custom_pipeline:{','.join(models_to_run)}"
                
            task = {
                "task_id": task_id,
                "asset_id": asset_id,
                "file_path": file_path,
                "status": "queued",
                "priority": priority,
                "model_name": resolved_model_name,
                "models_to_run": models_to_run,
                "retry_count": 0,
                "error_message": None,
                "result": None,
                "created_at": time.time(),
                "started_at": None,
                "completed_at": None,
                "cancelled_at": None
            }
            self.tasks[task_id] = task
            return task

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Fetch task details, falling back to SQLite tasks cache if evicted from memory."""
        with self.lock:
            task = self.tasks.get(task_id)
            if task:
                return task
                
        # Memory miss, search in persistent cache
        try:
            import sqlite3
            import json
            conn = sqlite3.connect(self.cache_db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT task_id, asset_id, file_path, status, priority, model_name,
                       result_json, error_message, created_at, started_at, completed_at
                FROM task_results WHERE task_id = ?
            """, (task_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                task_id, asset_id, file_path, status, priority, model_name, result_json, error_message, created_at, started_at, completed_at = row
                models_to_run = None
                if model_name and model_name.startswith("custom_pipeline:"):
                    models_to_run = model_name.replace("custom_pipeline:", "").split(",")
                return {
                    "task_id": task_id,
                    "asset_id": asset_id,
                    "file_path": file_path,
                    "status": status,
                    "priority": priority,
                    "model_name": model_name,
                    "models_to_run": models_to_run,
                    "retry_count": 0,
                    "error_message": error_message,
                    "result": json.loads(result_json) if result_json else None,
                    "created_at": created_at,
                    "started_at": started_at,
                    "completed_at": completed_at,
                    "cancelled_at": completed_at if status == "cancelled" else None
                }
        except Exception as e:
            print(f"[TaskQueue] Failed to query persistent task cache for {task_id}: {e}")
            
        return None

    def update_task_status(self, task_id: str, status: str, result: Optional[Any] = None, error_message: Optional[str] = None) -> None:
        """Update task properties and timestamps."""
        with self.lock:
            task = self.tasks.get(task_id)
            if not task:
                return

            task["status"] = status
            if status == "running":
                task["started_at"] = time.time()
            elif status == "cancelled":
                task["cancelled_at"] = time.time()
                task["completed_at"] = time.time()
            elif status in ["completed", "failed"]:
                task["completed_at"] = time.time()
                if result is not None:
                    task["result"] = result
                if error_message is not None:
                    task["error_message"] = error_message

            # Persist finished tasks to tasks_cache.db
            if status in ["completed", "failed", "cancelled"]:
                try:
                    import sqlite3
                    import json
                    conn = sqlite3.connect(self.cache_db_path)
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT OR REPLACE INTO task_results (
                            task_id, asset_id, file_path, status, priority, model_name,
                            result_json, error_message, created_at, started_at, completed_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        task["task_id"],
                        task["asset_id"],
                        task["file_path"],
                        task["status"],
                        task["priority"],
                        task["model_name"],
                        json.dumps(task["result"]) if task["result"] is not None else None,
                        task["error_message"],
                        task["created_at"],
                        task["started_at"],
                        task["completed_at"]
                    ))
                    conn.commit()
                    conn.close()
                except Exception as db_err:
                    print(f"[TaskQueue] Failed to persist finished task {task_id} to sqlite cache: {db_err}")

    def pop_next_tag_task(self) -> Optional[Dict[str, Any]]:
        """Pops next queued tag job sorted by priority (descending) and created_at (ascending)."""
        with self.lock:
            waiting = [
                t for t in self.tasks.values() 
                if t["status"] == "queued" and "tag" in t["task_id"]
            ]
            if not waiting:
                return None

            # Sort by priority (high first), then created_at (old first)
            waiting.sort(key=lambda x: (-x["priority"], x["created_at"]))
            next_task = waiting[0]
            next_task["status"] = "running"
            next_task["started_at"] = time.time()
            return next_task

    def pop_next_tag_batch(self, batch_size: int) -> List[Dict[str, Any]]:
        """Pops up to batch_size waiting tagging tasks from queue, sorted by priority and creation time."""
        with self.lock:
            waiting = [
                t for t in self.tasks.values() 
                if t["status"] == "queued" and "tag" in t["task_id"]
            ]
            if not waiting:
                return []

            # Sort by priority (high first), then created_at (old first)
            waiting.sort(key=lambda x: (-x["priority"], x["created_at"]))
            batch = waiting[:batch_size]
            for task in batch:
                task["status"] = "running"
                task["started_at"] = time.time()
            return batch

    def get_queue_stats(self) -> Dict[str, Any]:
        """Returns counts of queued, running, completed, failed and cancelled tasks."""
        with self.lock:
            stats = {"queued": 0, "running": 0, "completed": 0, "failed": 0, "cancelled": 0, "total": 0}
            for t in self.tasks.values():
                status = t["status"]
                if status in stats:
                    stats[status] += 1
                stats["total"] += 1
            return stats
