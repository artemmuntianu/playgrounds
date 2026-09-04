"""
Generate a semantic mask (sky / ground / rest) for a photo.

Pipeline:
1. Segformer (nvidia/segformer-b0-finetuned-ade-512-512) does a dense,
   per-pixel ADE20K segmentation. SegFormer is used because it handles sky
   regions that are *enclosed* by objects (foliage) better than Mask2Former.
2. HSV-refiner step: inside the tree-crown region the network marks, an HSV
   filter finds bright / whitish / bluish pixels (sky seen through leaves) and
   reclassifies them as sky. This recovers sky pixels the model mistook for
   vertical objects.

Classes (RGB):
    sky     -> (30, 120, 255)
    ground  -> (50, 190, 90)    # floor / road / grass / sidewalk / earth / path
    rest    -> (255, 60, 50)    # everything else (buildings, trees, people, etc.)
"""

import numpy as np
from PIL import Image
import torch
import scipy.ndimage as ndi
from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor

# ---------------------------------------------------------------- config
IMAGE_PATH = r"D:\Work\play-model-portal\data\playgrounds\casal_dos_romeiros\photos\photo_1788255931191.jpg"
OUTPUT_PATH = r"D:\Work\play-model-portal\data\playgrounds\casal_dos_romeiros\photos\photo_1788255931191_mask.png"

# Colour palette (RGB)
COLOR_SKY = np.array([30, 120, 255], dtype=np.uint8)     # sky
COLOR_GROUND = np.array([50, 190, 90], dtype=np.uint8)   # ground / floor / path
COLOR_REST = np.array([255, 60, 50], dtype=np.uint8)     # rest

# ADE20K class ids
SKY_CLASSES = {2}                                        # sky
GROUND_CLASSES = {3, 6, 9, 11, 13, 29, 94}               # floor/road/grass/sidewalk/earth/field/land
TREE_CLASS_ID = 4                                        # crown region for the HSV-refiner

MODEL_NAME = "nvidia/segformer-b0-finetuned-ade-512-512"

# ---- HSV sky-refiner tuning (tweak these) ----
REFINE_ENABLED = True
V_SKY = 0.55          # same as luminance (V in 0..1): pixel is "bright"
S_CLOUD = 0.28        # saturation below this + bright => whitish/gray cloud/overcast sky
H_SKY_LO, H_SKY_HI = 160.0, 280.0   # degrees: bluish/cyan hue => clearer blue sky
S_SKY = 0.55          # saturation ceiling for the blue-sky branch
MIN_SKY_HOLE = 5      # drop reclassified specks smaller than this many pixels
# "embedded in a crown" gate: test that the pixel is surrounded by green foliage.
# Uses green-dominance so it works with desaturated (overcast-light) leaves and
# still excludes gray metal gear / white signage (where G ~ R ~ B).
GREEN_WINDOW = 9
GREEN_MIN = 0.20      # fraction of the local window that must be green foliage
FOLIAGE_V_MAX = 0.78  # foliage pixels are not too bright
# drop thin, clongated reclassified blobs (bright metal frame legs / poles)
ELONG_MIN_THICKNESS = 8   # blobs thinner than this (px)...
ELONG_RATIO = 3.5         # ...and this much longer than wide -> not a sky gap

# ---------------------------------------------------------------- helpers
def rgb_to_hsv_np(img_uint8):
    """Vectorized RGB (H,W,3 uint8) -> (H, S, V). H in degrees [0,360), S,V in [0,1]."""
    rgb = img_uint8.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    diff = mx - mn
    h = np.zeros_like(mx)
    m = diff > 0
    with np.errstate(divide="ignore", invalid="ignore"):
        idx = (mx == r) & m
        h[idx] = (60.0 * ((g - b) / diff))[idx] % 360.0
        idx = (mx == g) & m
        h[idx] = (60.0 * ((b - r) / diff) + 120.0)[idx]
        idx = (mx == b) & m
        h[idx] = (60.0 * ((r - g) / diff) + 240.0)[idx]
    h[h < 0] += 360.0
    s = np.where(mx > 0, diff / np.maximum(mx, 1e-9), 0.0)
    v = mx
    return h, s, v

def refine_sky_with_hsv(img_uint8, pred_seg):
    """Return a boolean mask naming pixels to reclassify as 'sky'."""
    h, s, v = rgb_to_hsv_np(img_uint8)

    # Sky-like colour test (bright & whitish, OR bright & bluish)
    whitish = (v > V_SKY) & (s < S_CLOUD)
    bluish = (
        (v > V_SKY)
        & (h >= H_SKY_LO) & (h <= H_SKY_HI)
        & (s < S_SKY)
    )
    sky_like = whitish | bluish

    # Foliage (green leaves) mask — used to verify a sky pixel is really a gap
    # inside a crown. Gray metal gear / white signage have few green neighbours,
    # so they are rejected.
    # Foliage = green-dominant, not-too-bright pixels. Catches desaturated leaf
    # green, while gray metal / white signage (G ~ R ~ B) are excluded.
    rgb = img_uint8.astype(np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    foliage = (g >= r) & (g >= b) & (v < FOLIAGE_V_MAX)
    local_green = ndi.uniform_filter(foliage.astype(np.float32), size=GREEN_WINDOW)

    # Candidate region = tree crowns only
    crown = pred_seg == TREE_CLASS_ID
    candidate = crown

    # A pixel becomes sky only if it's sky-like AND sits inside a leafy crown.
    refine = sky_like & candidate & (local_green > GREEN_MIN)

    # Drop tiny specks of noise, but keep real small sky holes in foliage.
    # Also drop thin, highly elongated blobs (e.g. the bright metal swing-frame
    # legs), which are objects, not sky.
    labelled, n = ndi.label(refine)
    if n:
        sizes = ndi.sum(refine, labelled, index=np.arange(1, n + 1))
        keep = np.zeros(n + 1, dtype=bool)
        keep[1:] = sizes >= MIN_SKY_HOLE
        for i, sl in enumerate(ndi.find_objects(labelled), start=1):
            if sl is None:
                continue
            hgt = sl[0].stop - sl[0].start
            wid = sl[1].stop - sl[1].start
            mn = min(hgt, wid)
            mx = max(hgt, wid)
            if mn < ELONG_MIN_THICKNESS and mx / max(mn, 1) > ELONG_RATIO:
                keep[i] = False
        refine = keep[labelled]
    return refine

# ---------------------------------------------------------------- load model
print(f"Loading model: {MODEL_NAME}")
processor = SegformerImageProcessor.from_pretrained(MODEL_NAME)
model = SegformerForSemanticSegmentation.from_pretrained(MODEL_NAME)
model.eval()

# ---------------------------------------------------------------- load photo
image = Image.open(IMAGE_PATH).convert("RGB")
orig_w, orig_h = image.size
img_np = np.asarray(image)
print(f"Input image: {orig_w}x{orig_h} ({IMAGE_PATH})")

# ---------------------------------------------------------------- inference
inputs = processor(images=image, return_tensors="pt")
with torch.no_grad():
    outputs = model(**inputs)

upsampled_logits = torch.nn.functional.interpolate(
    outputs.logits, size=(orig_h, orig_w), mode="bilinear", align_corners=False
)
pred_seg = upsampled_logits.argmax(dim=1)[0].cpu().numpy()

# ---------------------------------------------------------------- build base mask
mask_rgb = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
mask_rgb[:] = COLOR_REST
base_sky = np.isin(pred_seg, list(SKY_CLASSES))
base_ground = np.isin(pred_seg, list(GROUND_CLASSES))
mask_rgb[base_sky] = COLOR_SKY
mask_rgb[base_ground] = COLOR_GROUND

total = orig_w * orig_h
n_sky_before = int(base_sky.sum())
print(f"Before refine: sky {n_sky_before/total:.1%}, "
      f"ground {int(base_ground.sum())/total:.1%}, "
      f"rest {int((~base_sky & ~base_ground).sum())/total:.1%}")

# ---------------------------------------------------------------- HSV refine
if REFINE_ENABLED:
    refine = refine_sky_with_hsv(img_np, pred_seg)
    mask_rgb[refine] = COLOR_SKY
    n_sky_after = int((mask_rgb == COLOR_SKY).all(axis=2).sum())
    print(f"HSV-refiner recovered {int(refine.sum())} sky pixels "
          f"(sky {n_sky_before/total:.1%} -> {n_sky_after/total:.1%})")

# ---------------------------------------------------------------- report
n_sky = int((mask_rgb == COLOR_SKY).all(axis=2).sum())
n_ground = int((mask_rgb == COLOR_GROUND).all(axis=2).sum())
n_rest = int((mask_rgb == COLOR_REST).all(axis=2).sum())
print(f"Final split: sky {n_sky/total:.1%}, ground {n_ground/total:.1%}, "
      f"rest {n_rest/total:.1%}")
present = sorted(np.unique(pred_seg).tolist())
print("Predicted class ids present:", present)

# ---------------------------------------------------------------- save
mask_image = Image.fromarray(mask_rgb)
mask_image.save(OUTPUT_PATH, format="PNG")
print(f"Mask saved: {OUTPUT_PATH} ({mask_image.size[0]}x{mask_image.size[1]}, PNG)")

