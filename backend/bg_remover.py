import os
import io
import base64
import logging
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import label, binary_fill_holes

# Set local U2NET model directory inside the project so rembg can access model weights
PROJECT_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
U2NET_DIR = os.path.join(PROJECT_BACKEND_DIR, ".u2net")
os.makedirs(U2NET_DIR, exist_ok=True)
os.environ["U2NET_HOME"] = U2NET_DIR

logger = logging.getLogger(__name__)

def remove_bg_base64(image_base64: str) -> str:
    """
    Takes a base64 encoded image string (JPEG/PNG from Gemini/Cloudflare/OpenAI),
    removes the outer background, preserves interior features (teeth/eyes),
    and applies a uniform smooth white die-cut sticker border for 100% pack consistency.
    """
    try:
        clean_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
        img_bytes = base64.b64decode(clean_b64)
        input_img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
        
        output_img = None
        
        # Stage 1: AI Background Removal (rembg U2-Net) + Interior Hole Preservation
        try:
            from rembg import remove
            rembg_result = remove(input_img)
            candidate = _preserve_interior_alpha(rembg_result)
            valid, ratio = _check_cutout_validity(candidate)
            logger.info(f"Stage 1 rembg cutout validity: valid={valid}, solid_ratio={ratio:.4f}")
            if valid:
                output_img = candidate
                logger.info("Background removed successfully via rembg AI model.")
        except Exception as e:
            logger.warning(f"rembg AI removal failed or threw exception: {e}")
            
        # Stage 2: Dynamic Border-Connected Flood Fill (removes outer bg ONLY)
        if output_img is None:
            candidate = _edge_connected_bg_removal(input_img)
            valid, ratio = _check_cutout_validity(candidate)
            logger.info(f"Stage 2 floodfill cutout validity: valid={valid}, solid_ratio={ratio:.4f}")
            if valid:
                output_img = candidate
                logger.info("Background removed via border-connected flood fill.")
                
        # Stage 3: Fail-Safe Backup
        if output_img is None:
            logger.warning("All background removal stages failed to produce a valid cutout. Returning original image.")
            output_img = input_img

        # Stage 4: Apply Uniform Smooth White Sticker Die-Cut Border for 100% Pack Consistency
        final_sticker = add_uniform_sticker_border(output_img, border_size=8)

        # Encode back to PNG base64
        buffered = io.BytesIO()
        final_sticker.save(buffered, format="PNG")
        output_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return output_b64

    except Exception as err:
        logger.error(f"Critical error in background removal: {err}", exc_info=True)
        return image_base64

def add_uniform_sticker_border(rgba_img: Image.Image, border_size: int = 8) -> Image.Image:
    """
    Adds a uniform, smooth white die-cut border around the character cutout.
    Guarantees 100% visual consistency across all generated stickers in a pack.
    """
    arr = np.array(rgba_img)
    alpha = arr[:, :, 3]
    
    # Create binary mask of character body
    mask = (alpha > 30).astype(np.uint8) * 255
    mask_img = Image.fromarray(mask, mode="L")
    
    # Dilate mask outwards
    dilated_mask = mask_img.filter(ImageFilter.MaxFilter(border_size * 2 + 1))
    
    # Anti-alias dilated border edge with light blur
    smoothed_border = dilated_mask.filter(ImageFilter.GaussianBlur(1.2))
    border_alpha = np.array(smoothed_border)
    
    # Construct RGBA white border canvas
    h, w, _ = arr.shape
    border_rgba = np.zeros((h, w, 4), dtype=np.uint8)
    border_rgba[:, :, 0] = 255
    border_rgba[:, :, 1] = 255
    border_rgba[:, :, 2] = 255
    border_rgba[:, :, 3] = border_alpha
    
    # Alpha composite original character image over white border canvas
    border_img = Image.fromarray(border_rgba, mode="RGBA")
    border_img.alpha_composite(rgba_img)
    
    return border_img

def _check_cutout_validity(img: Image.Image) -> tuple[bool, float]:
    """
    Validates that a cutout is NOT completely blank/transparent or destroyed.
    A valid sticker cutout must have between 5% and 92% opaque pixels.
    """
    arr = np.array(img.convert("RGBA"))
    alpha = arr[:, :, 3]
    total_pixels = alpha.size
    solid_pixels = np.sum(alpha > 100)
    solid_ratio = solid_pixels / total_pixels
    is_valid = 0.05 <= solid_ratio <= 0.92
    return is_valid, solid_ratio

def _preserve_interior_alpha(rgba_img: Image.Image) -> Image.Image:
    """
    Takes a rembg output image and fills any interior transparent holes (e.g. teeth, eye whites)
    so that only the exterior background is transparent.
    """
    arr = np.array(rgba_img)
    alpha = arr[:, :, 3]
    
    # Character mask (opaque/semi-opaque body)
    character_mask = (alpha > 20)
    
    # Fill enclosed interior holes (like white teeth / eyes inside character outline)
    filled_mask = binary_fill_holes(character_mask)
    
    # Identify interior holes (where filled_mask is True but alpha is currently transparent/low)
    interior_holes = filled_mask & (alpha < 50)
    
    # Restore ONLY interior holes to 255 opacity
    arr[interior_holes, 3] = 255
    
    return Image.fromarray(arr, mode="RGBA")

def _edge_connected_bg_removal(img: Image.Image) -> Image.Image:
    """
    Uses connected-component labeling from outer image borders to remove
    ONLY the outer background based on dynamic corner color sampling.
    Interior white pixels (teeth, eyes, steam) are surrounded by outlines
    and NOT connected to outer borders, so they remain 100% opaque.
    """
    arr = np.array(img.convert("RGBA"))
    
    # Sample background color from 4 image corners
    corners = [arr[0, 0, :3], arr[0, -1, :3], arr[-1, 0, :3], arr[-1, -1, :3]]
    avg_bg_color = np.mean(corners, axis=0)
    
    # Color distance from corner background color
    color_dist = np.linalg.norm(arr[:, :, :3].astype(float) - avg_bg_color, axis=2)
    is_bg_candidate = color_dist < 50.0
    
    # Label connected components of background pixels
    labeled_array, num_features = label(is_bg_candidate)
    
    if num_features == 0:
        return img

    # Find component IDs that touch the outer boundary
    boundary_pixels = np.concatenate([
        labeled_array[0, :],         # top row
        labeled_array[-1, :],        # bottom row
        labeled_array[:, 0],         # left col
        labeled_array[:, -1]         # right col
    ])
    
    outer_bg_ids = set(boundary_pixels) - {0} # Exclude non-background (0)
    
    # Create mask for ONLY outer background components
    is_outer_bg = np.isin(labeled_array, list(outer_bg_ids))
    
    # Set alpha to 0 for outer background only
    result_arr = arr.copy()
    result_arr[is_outer_bg, 3] = 0
    
    return Image.fromarray(result_arr, mode="RGBA")
