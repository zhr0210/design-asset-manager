def format_prompt(prompt_text: str) -> str:
    """
    Cleans and standardizes prompt text for Stable Diffusion / Midjourney.
    Ensures single spacing and removes trailing commas or periods.
    """
    if not prompt_text:
        return ""
        
    cleaned = " ".join(prompt_text.strip().split())
    if cleaned.endswith((".", ",")):
        cleaned = cleaned[:-1]
        
    return cleaned
