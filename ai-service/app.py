import sys
sys.stdout.reconfigure(errors='replace')
sys.stderr.reconfigure(errors='replace')

import uvicorn
import asyncio
import uuid
from fastapi import FastAPI, HTTPException, BackgroundTasks
from contextlib import asynccontextmanager

from core.task_queue import TaskQueue
from core.model_manager import ModelManager
from core.batch_scheduler import BatchScheduler
from core.clip_siglip_onnx_compat import probe_clip_siglip_onnx_environment
from core.python_mps_compat import probe_python_mps_environment
from core.gpu_monitor import get_gpu_status
from core.macos_ai_capabilities import probe_macos_ai_capabilities
from core.mps_execution_probe import probe_python_mps_execution
from core.onnx_model_load_probe import probe_registered_onnx_model_load
from core.mock_policy import is_strict_real_ai
from schemas.tag_schema import TagEnqueueRequest
from schemas.prompt_schema import PromptGenerateRequest
from schemas.analysis_schema import AnalysisGenerateRequest
from workers.prompt_worker import PromptWorker
from workers.analysis_worker import AnalysisWorker
from models.asset_type_router import AssetTypeRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle startup and shutdown hooks for FastAPI."""
    # Startup: Patch tqdm with premium TUI progress display
    try:
        from utils.progress_bar import patch_tqdm_for_tui
        patch_tqdm_for_tui()
    except Exception as e:
        print(f"Failed to patch tqdm for TUI: {e}")
        
    # Start batch queue scheduler
    scheduler = BatchScheduler()
    scheduler.start()
    yield
    # Shutdown: Stop batch queue scheduler
    scheduler.stop()

app = FastAPI(
    title="Design Asset Manager - AI Worker Service",
    description="Asynchronous GPU model manager, batch tag scheduler, and prompt reverser.",
    version="1.0.0",
    lifespan=lifespan
)

# Core Singletons
task_queue = TaskQueue()
model_manager = ModelManager()

@app.get("/health")
async def health():
    """Lightweight health endpoint for Electron runtime management."""
    return {
        "success": True,
        "service": "ai-worker",
        "strict_real_ai": is_strict_real_ai()
    }

@app.post("/ai/tag/enqueue", status_code=202)
async def enqueue_tag(request: TagEnqueueRequest):
    """Enqueues a new image for background batch tagging."""
    task_id = f"task-tag-{uuid.uuid4().hex[:8]}"
    task = task_queue.enqueue(
        task_id=task_id,
        asset_id=request.asset_id,
        file_path=request.file_path,
        model_name=request.model_name,
        priority=request.priority,
        models_to_run=request.models_to_run
    )
    return {
        "success": True,
        "message": "Image tagging task enqueued successfully.",
        "task_id": task_id,
        "status": task["status"]
    }

@app.post("/ai/tag/process-batch")
async def process_batch():
    """Explicitly triggers immediate background batch tagging runs."""
    scheduler = BatchScheduler()
    waiting_count = await scheduler.trigger_batch_now()
    return {
        "success": True,
        "message": f"Batch tagging execution triggered for {waiting_count} waiting tasks.",
        "processed_count": waiting_count
    }

@app.get("/ai/tag/status")
async def tag_status():
    """Returns task counts in queue and scheduler configurations."""
    stats = task_queue.get_queue_stats()
    scheduler = BatchScheduler()
    return {
        "queue_stats": stats,
        "auto_trigger_threshold": scheduler.threshold,
        "worker_running": scheduler.tag_worker.running
    }

@app.post("/ai/prompt/generate", status_code=202)
async def generate_prompt(request: PromptGenerateRequest, background_tasks: BackgroundTasks):
    """Triggers manual JoyCaption prompt generation in the background."""
    if is_strict_real_ai():
        raise HTTPException(
            status_code=501,
            detail="Python PromptWorker mock path is disabled in production. Use the Qwen3-VL Llama/OpenAI-compatible prompt route."
        )

    task_id = f"task-prompt-{uuid.uuid4().hex[:8]}"
    task_queue.enqueue(
        task_id=task_id,
        asset_id=request.asset_id,
        file_path=request.file_path,
        model_name=request.model_name,
        priority=10 # Higher priority
    )
    
    # Schedule background prompt worker execution
    worker = PromptWorker()
    background_tasks.add_task(worker.run_prompt_task, task_id)

    return {
        "success": True,
        "message": "JoyCaption prompt task started asynchronously.",
        "task_id": task_id,
        "status": "queued"
    }

@app.get("/ai/prompt/status/{task_id}")
async def prompt_status(task_id: str):
    """Retrieve details and results of a prompt task."""
    task = task_queue.get_task(task_id)
    if not task:
        return {
            "task_id": task_id,
            "status": "failed",
            "error_message": "Task lost due to AI worker restart or memory eviction"
        }
    return task

@app.post("/ai/analysis/generate", status_code=202)
async def generate_analysis(request: AnalysisGenerateRequest, background_tasks: BackgroundTasks):
    """Triggers manual Qwen2.5-VL layout design analysis in the background."""
    if is_strict_real_ai():
        raise HTTPException(
            status_code=501,
            detail="Python AnalysisWorker mock path is disabled in production. Use a real VLM analysis backend."
        )

    task_id = f"task-analysis-{uuid.uuid4().hex[:8]}"
    task_queue.enqueue(
        task_id=task_id,
        asset_id=request.asset_id,
        file_path=request.file_path,
        model_name=request.model_name,
        priority=10 # Higher priority
    )
    
    # Schedule background analysis worker execution
    worker = AnalysisWorker()
    background_tasks.add_task(worker.run_analysis_task, task_id)

    return {
        "success": True,
        "message": "Qwen2.5-VL deep design sweep task started asynchronously.",
        "task_id": task_id,
        "status": "queued"
    }

@app.get("/ai/analysis/status/{task_id}")
async def analysis_status(task_id: str):
    """Retrieve details and results of an analysis task."""
    task = task_queue.get_task(task_id)
    if not task:
        return {
            "task_id": task_id,
            "status": "failed",
            "error_message": "Task lost due to AI worker restart or memory eviction"
        }
    return task

@app.get("/ai/model/status")
async def model_status():
    """Retrieve loaded models, keep-alive timers, VRAM status, and configuration metrics."""
    loaded = model_manager.get_loaded_models()
    gpu = get_gpu_status()
    
    # Extract metadata from active WDTaggerModel if loaded
    backend_name = "mock"
    threshold_general = 0.35
    threshold_character = 0.35
    threshold_rating = 0.5
    max_tags = 30
    batch_size = 8
    avg_time_per_image = 0.0
    last_error = None
    
    wd_info = model_manager.loaded_models.get("wd_tagger")
    if wd_info and wd_info.get("instance"):
        instance = wd_info.get("instance")
        backend_name = getattr(instance, "backend", "mock")
        threshold_general = getattr(instance, "threshold_general", 0.35)
        threshold_character = getattr(instance, "threshold_character", 0.35)
        threshold_rating = getattr(instance, "threshold_rating", 0.5)
        max_tags = getattr(instance, "max_tags", 30)
        avg_history = getattr(instance, "inference_time_history", [])
        if avg_history:
            avg_time_per_image = round(sum(avg_history) / len(avg_history), 3)
        last_error = getattr(instance, "last_error", None)
        
    return {
        "loaded_models": loaded,
        "cooperative_models": model_manager.get_cooperative_status(),
        "gpu_status": gpu,
        "wd_tagger_config": {
            "model_id": "SmilingWolf/wd-vit-tagger-v3",
            "backend": backend_name,
            "batch_size": batch_size,
            "threshold_general": threshold_general,
            "threshold_character": threshold_character,
            "threshold_rating": threshold_rating,
            "max_tags": max_tags,
            "avg_time_per_image": avg_time_per_image,
            "last_error": last_error
        }
    }

@app.get("/ai/model/cooperative-status")
async def cooperative_model_status():
    """Returns the status of all 4 cooperative models (RAM, Florence-2, CLIP, WD Tagger) with their roles."""
    cooperative = model_manager.get_cooperative_status()
    gpu = get_gpu_status()
    return {
        "cooperative_models": cooperative,
        "gpu_status": gpu,
        "routing_strategy": {
            "photo": ["ram", "design_rule"],
            "product": ["ram", "design_rule"],
            "illustration": ["ram", "design_rule"],
            "design": ["ram", "florence2", "clip", "design_rule"],
            "ui": ["ram", "florence2", "design_rule"],
            "document": ["ram", "florence2", "design_rule"],
            "anime": ["wd_tagger"],
            "unknown": ["ram", "design_rule", "clip"]
        }
    }

@app.get("/ai/runtime/macos-capabilities")
async def macos_runtime_capabilities():
    """Return macOS AI branch runtime capability probes without loading models."""
    return probe_macos_ai_capabilities()

@app.get("/ai/model/clip-siglip-onnx/status")
async def clip_siglip_onnx_status():
    """Return the CLIP/SigLIP ONNX environment compatibility signal."""
    return probe_clip_siglip_onnx_environment()

@app.post("/ai/model/onnx-load-probe")
async def onnx_model_load_probe():
    """Explicitly verify that the registered WD Tagger ONNX artifact can create a real session."""
    return await asyncio.to_thread(probe_registered_onnx_model_load)

@app.get("/ai/model/python-mps/status")
async def python_mps_status():
    """Return the Python MPS environment compatibility signal."""
    return probe_python_mps_environment()

@app.post("/ai/model/python-mps/execution-probe")
async def python_mps_execution_probe():
    """Explicitly execute a fixed tensor operation on the real MPS device."""
    return await asyncio.to_thread(probe_python_mps_execution)

@app.get("/ai/routing/preview")
async def preview_routing(file_path: str = ""):
    """Preview how a given file path would be routed in the cooperative tagger system."""
    if not file_path:
        return {"error": "file_path parameter is required"}
    route = await AssetTypeRouter.route(file_path)
    return {
        "file_path": file_path,
        "routing_result": route
    }

@app.post("/ai/model/unload")
async def unload_models():
    """Forcibly unloads all loaded models and releases all GPU memory."""
    models_to_unload = list(model_manager.loaded_models.keys())
    for name in models_to_unload:
        await model_manager.unload_model(name)
    return {
        "success": True,
        "message": f"Successfully evicted {len(models_to_unload)} models and cleared GPU caches.",
        "unloaded_models": models_to_unload
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
