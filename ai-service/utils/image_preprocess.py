import sys
sys.stdout.reconfigure(errors='replace')
sys.stderr.reconfigure(errors='replace')

import os
import sqlite3
import urllib.request
import numpy as np
from PIL import Image

def ensure_local_image(image_path: str) -> None:
    """
    Checks if the local image exists. If not, queries the SQLite database
    at ~/DesignAssetManager/design_asset_manager.db to find the remote URL (original_url or thumbnail_path)
    for this asset, and downloads it to the expected path.
    """
    expanded_path = os.path.expanduser(image_path)
    if os.path.exists(expanded_path):
        return

    # Expand DB path
    db_path = os.path.expanduser("~/DesignAssetManager/design_asset_manager.db")
    if not os.path.exists(db_path):
        print(f"[ensure_local_image] Database not found at: {db_path}")
        return

    basename = os.path.basename(image_path)
    print(f"[ensure_local_image] Image not found at: {expanded_path}. Searching SQLite for remote URL...")

    url_to_download = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Try matching exact file_path, expanded file_path, or pattern ending with basename
        cursor.execute(
            "SELECT original_url, thumbnail_path FROM assets WHERE file_path = ? OR file_path = ? OR file_path LIKE ?",
            (image_path, expanded_path, f"%/{basename}")
        )
        row = cursor.fetchone()
        
        if not row:
            # Fallback matching by basename in file_name or file_path
            cursor.execute(
                "SELECT original_url, thumbnail_path FROM assets WHERE file_name = ? OR file_path LIKE ?",
                (basename, f"%{basename}")
            )
            row = cursor.fetchone()
            
        if row:
            original_url, thumbnail_path = row
            url_to_download = original_url if original_url and original_url.startswith("http") else thumbnail_path
            
        conn.close()
    except Exception as db_err:
        print(f"[ensure_local_image] SQLite database query failed: {db_err}")

    if not url_to_download or not url_to_download.startswith("http"):
        print(f"[ensure_local_image] No remote HTTP URL found for image: {basename}")
        return

    # Download from remote URL
    try:
        print(f"[ensure_local_image] Downloading image from {url_to_download} to {expanded_path}...")
        os.makedirs(os.path.dirname(expanded_path), exist_ok=True)
        
        headers = {'User-Agent': 'Mozilla/5.0'}
        req = urllib.request.Request(url_to_download, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(expanded_path, "wb") as out_file:
                out_file.write(response.read())
                
        print(f"[ensure_local_image] Successfully downloaded! Size: {os.path.getsize(expanded_path)} bytes.")
    except Exception as dl_err:
        print(f"[ensure_local_image] Failed to download remote image: {dl_err}")

def preprocess_image(image_path: str):
    """
    Simulates image preprocessing (resizing, normalization).
    Reads the actual image specs to ensure robust local execution.
    """
    try:
        ensure_local_image(image_path)
    except Exception as e:
        print(f"[preprocess_image] Error ensuring local image: {e}")

    image_path = os.path.expanduser(image_path)
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")

    try:
        with Image.open(image_path) as img:
            width, height = img.size
            file_size = os.path.getsize(image_path)
            
            return {
                "valid": True,
                "width": width,
                "height": height,
                "format": img.format,
                "file_size": file_size,
                "channels": len(img.getbands())
            }
    except Exception as e:
        raise ValueError(f"Failed to parse image file: {e}")

def prepare_image_for_wd_tagger(image_path: str, target_size: int = 448) -> np.ndarray:
    """
    Opens an image, resolves transparency/alpha channel with a white background,
    pads the image with white space to be a square of target_size x target_size
    (preserving original aspect ratio via letterboxing), and converts to a
    numpy float32 array in BGR channel order with values [0.0, 255.0].
    """
    try:
        ensure_local_image(image_path)
    except Exception as e:
        print(f"[prepare_image_for_wd_tagger] Error ensuring local image: {e}")

    image_path = os.path.expanduser(image_path)
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")
        
    try:
        with Image.open(image_path) as img:
            # 1. Handle alpha transparency (blend onto a white background)
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                # Convert source image to RGBA to get the alpha mask
                rgba_img = img.convert("RGBA")
                bg.paste(rgba_img, mask=rgba_img.split()[3])
                img = bg
            else:
                img = img.convert("RGB")
            
            # 2. Aspect-ratio letterbox padding to square target_size x target_size
            w, h = img.size
            ratio = float(target_size) / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            
            # Resize image keeping aspect ratio
            img_resized = img.resize(new_size, Image.Resampling.BILINEAR)
            
            # Create a square white canvas
            square_img = Image.new("RGB", (target_size, target_size), (255, 255, 255))
            # Paste the resized image centered
            paste_pos = ((target_size - new_size[0]) // 2, (target_size - new_size[1]) // 2)
            square_img.paste(img_resized, paste_pos)
            
            # 3. Convert to float32 NumPy array
            image_np = np.array(square_img).astype(np.float32)
            
            # 4. Swap channels from RGB to BGR (required by WD Tagger models)
            image_bgr = image_np[:, :, ::-1]
            
            return image_bgr
    except Exception as e:
        raise ValueError(f"Failed to preprocess image for WD Tagger: {e}")


