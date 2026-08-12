import os
import io
import base64
import logging
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

# Set local U2NET model directory inside the project so rembg can access model weights
PROJECT_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
U2NET_DIR = os.path.join(PROJECT_BACKEND_DIR, ".u2net")
os.makedirs(U2NET_DIR, exist_ok=True)
os.environ["U2NET_HOME"] = U2NET_DIR

logger = logging.getLogger(__name__)

def remove_bg_base64(image_base64: str) -> str:
    """
    Takes a base64 encoded image string (JPEG/PNG from Gemini),
    removes the outer background while preserving ALL interior features
    (teeth, eyes, steam, highlights), and returns a transparent RGBA PNG base64 string.
    """
    try:
        # Decode base64 to PIL Image
        img_bytes = base64.b64decode(image_base64)
        input_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        
        output_img = None
        
        # Method 1: AI Background Removal (rembg U2-Net) + Interior Hole Preservation
        try:
            from rembg import remove
            rembg_result = remove(input_img)
            
            # Post-process alpha channel to guarantee interior features (teeth/eyes) stay 100% solid
            output_img = _preserve_interior_alpha(rembg_result)
            logger.info("Background removed successfully via rembg AI model with interior preservation.")
        except Exception as e:
            logger.warning(f"rembg AI removal failed ({e}), falling back to border-connected flood fill.")
            # Method 2: Edge-connected Flood Fill (removes outer bg ONLY, preserving teeth & eyes)
            output_img = _edge_connected_bg_removal(input_img)
            
        # Encode back to PNG base64
        buffered = io.BytesIO()
        output_img.save(buffered, format="PNG")
        output_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return output_b64

    except Exception as err:
        logger.error(f"Error in background removal: {err}")
        return image_base64

def _preserve_interior_alpha(rgba_img: Image.Image) -> Image.Image:
    """
    Takes a rembg output image and fills any interior transparent holes (e.g. teeth, eye whites)
    so that only the exterior background is transparent.
    """
    arr = np.array(rgba_img)
    alpha = arr[:, :, 3]
    
    # Non-transparent mask
    is_solid = (alpha > 100)
    
    # Fill enclosed interior holes (like white teeth, eye sclera surrounded by dark outlines)
    filled_solid = binary_fill_holes(is_solid)
    
    # Set all interior solid pixels to full opacity (255)
    arr[filled_solid, 3] = 255
    
    return Image.fromarray(arr, mode="RGBA")

def _edge_connected_bg_removal(img: Image.Image, threshold: int = 230) -> Image.Image:
    """
    Fallback method: Uses connected-component labeling from outer image borders to remove
    ONLY the outer background. Interior white pixels (teeth, eyes, steam) are surrounded
    by outlines and NOT connected to outer borders, so they remain 100% opaque.
    """
    arr = np.array(img.convert("RGBA"))
    
    # Identify near-white background pixels
    is_white = (arr[:, :, 0] >= threshold) & (arr[:, :, 1] >= threshold) & (arr[:, :, 2] >= threshold)
    
    # Label connected components of white pixels
    labeled_array, num_features = label(is_white)
    
    if num_features == 0:
        return img

    # Find component IDs that touch the outer boundary
    boundary_pixels = np.concatenate([
        labeled_array[0, :],         # top row
        labeled_array[-1, :],        # bottom row
        labeled_array[:, 0],         # left col
        labeled_array[:, -1]         # right col
    ])
    
    outer_bg_ids = set(boundary_pixels) - {0} # Exclude non-white (0)
    
    # Create mask for ONLY outer background components
    is_outer_bg = np.isin(labeled_array, list(outer_bg_ids))
    
    # Set alpha to 0 for outer background only
    result_arr = arr.copy()
    result_arr[is_outer_bg, 3] = 0
    
    return Image.fromarray(result_arr, mode="RGBA")
