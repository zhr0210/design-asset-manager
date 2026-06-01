import os
import json

def get_template_path(template_id: str, is_schema: bool = False) -> str:
    # template_id format: "qwen3vl.design_prompt.v1"
    parts = template_id.split(".")
    if len(parts) < 3 or parts[0] != "qwen3vl":
        raise ValueError(f"Invalid template_id format: '{template_id}'. Must start with 'qwen3vl.' and contain at least 3 parts.")
    
    # Path relative to this loader file
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # ai-service/
    
    sub_folder = parts[0] # "qwen3vl"
    name = parts[1] # "design_prompt"
    version = parts[2] # "v1"
    
    if is_schema:
        filename = f"{name}.output_schema.json"
    else:
        filename = f"{name}.{version}.txt"
        
    return os.path.join(base_dir, "prompts", sub_folder, filename)

def load_prompt_template(template_id: str) -> str:
    filepath = get_template_path(template_id, is_schema=False)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Prompt template file not found: {filepath} for template_id: {template_id}")
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read().strip()

def load_output_schema(template_id: str) -> dict:
    filepath = get_template_path(template_id, is_schema=True)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Output schema file not found: {filepath} for template_id: {template_id}")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)
