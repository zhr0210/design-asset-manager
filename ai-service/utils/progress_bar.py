import os
import sys
import time
import urllib.request
from typing import Optional

class TUIProgressBar:
    """
    Vibrant premium TUI Progress Bar with custom ANSI styling,
    real-time ETA, download speed, and glassmorphic-styled terminal aesthetics.
    """
    def __init__(self, total_bytes: int, filename: str = "Download"):
        self.total_bytes = total_bytes
        self.filename = filename
        self.start_time = time.time()
        self.downloaded_bytes = 0

    def update(self, bytes_chunk: int) -> None:
        self.downloaded_bytes += bytes_chunk
        self._render()

    def _render(self) -> None:
        percent = (self.downloaded_bytes / self.total_bytes) if self.total_bytes > 0 else 0.0
        percent = min(1.0, max(0.0, percent))
        
        elapsed = time.time() - self.start_time
        speed = (self.downloaded_bytes / elapsed) if elapsed > 0 else 0.0
        
        # Calculate ETA
        remaining_bytes = max(0, self.total_bytes - self.downloaded_bytes)
        eta = (remaining_bytes / speed) if speed > 0 else 0.0
        
        # Convert units to MB
        dl_mb = self.downloaded_bytes / (1024 * 1024)
        tot_mb = self.total_bytes / (1024 * 1024)
        speed_mb = speed / (1024 * 1024)
        
        # Visual progress blocks: purple to cyan gradients
        bar_length = 30
        filled_length = int(bar_length * percent)
        
        # ANSI Escape Codes for vibrant design aesthetics
        PURPLE = "\033[95m"
        CYAN = "\033[96m"
        GREEN = "\033[92m"
        GREY = "\033[90m"
        RESET = "\033[0m"
        BOLD = "\033[1m"
        
        filled_char = "▰"
        empty_char = "▱"
        
        bar = PURPLE + filled_char * filled_length + RESET + GREY + empty_char * (bar_length - filled_length) + RESET
        
        percentage_str = f"{BOLD}{CYAN}{percent * 100:6.2f}%{RESET}"
        size_str = f"{dl_mb:6.2f} MB / {tot_mb:6.2f} MB"
        speed_str = f"{BOLD}{GREEN}{speed_mb:5.2f} MB/s{RESET}"
        
        if percent >= 1.0:
            eta_str = f"{GREEN}Finished!{RESET}"
        else:
            eta_str = f"ETA {eta:5.1f}s"
            
        # Draw and flush to terminal line
        line = f"\r[ {self.filename} ] [ {bar} ]  {percentage_str}  {size_str}  {speed_str}  ({eta_str})"
        sys.stdout.write(line)
        sys.stdout.flush()
        
        if self.downloaded_bytes >= self.total_bytes:
            sys.stdout.write("\n")
            sys.stdout.flush()

def download_with_progress(url: str, dest_path: str, filename: Optional[str] = None) -> None:
    """
    Downloads any target URL with real-time TUIProgressBar updates in chunks.
    Reusable across this and future projects.
    """
    if not filename:
        filename = os.path.basename(dest_path) or "Asset"
        
    print(f"\033[95m[DownloadManager]\033[0m Initiating premium download of {filename}...")
    
    # Configure user-agent to bypass basic server blocks
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            total_size = int(response.info().get('Content-Length', 0).strip())
            progress = TUIProgressBar(total_bytes=total_size, filename=filename)
            
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            chunk_size = 1024 * 64 # 64KB blocks
            
            with open(dest_path, 'wb') as out_file:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    progress.update(len(chunk))
        print(f"\033[92m[DownloadManager]\033[0m Download complete: {filename}\n")
    except Exception as e:
        print(f"\033[91m[DownloadManager]\033[0m Download failed: {e}")
        raise e

def patch_tqdm_for_tui() -> None:
    """
    Dynamically overrides tqdm and tqdm.auto constructors so that ANY library
    calling tqdm downloads (like huggingface_hub model caches) automatically
    renders with our premium neon TUI progress bar!
    """
    try:
        import tqdm
        
        class TUItqdmProxy:
            def __init__(
                self, 
                iterable=None, 
                desc=None, 
                total=None, 
                disable=False, 
                unit=None, 
                *args, 
                **kwargs
            ):
                self.desc = desc or "Downloading"
                # Strip prefix for cleaner display
                if ":" in self.desc:
                    self.desc = self.desc.split(":")[-1].strip()
                self.desc = self.desc[:18] # Cap filename length
                
                self.total = total or 0
                self.disable = disable
                self.iterable = iterable
                self.bar = None
                
                if not self.disable:
                    self.bar = TUIProgressBar(total_bytes=self.total, filename=self.desc)
                
            def update(self, n=1):
                if self.bar and not self.disable:
                    self.bar.update(n)
                
            def close(self):
                pass
                
            def __iter__(self):
                if self.iterable is not None:
                    for item in self.iterable:
                        yield item
                        self.update(1)
                        
        # Patch core packages
        tqdm.tqdm = TUItqdmProxy
        try:
            import tqdm.auto
            tqdm.auto.tqdm = TUItqdmProxy
        except ImportError:
            pass
            
        print("\033[95m[ProgressManager]\033[0m Successfully hooked TUI ProgressBar proxy into tqdm!")
    except ImportError:
        pass
