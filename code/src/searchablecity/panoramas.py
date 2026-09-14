"""Legacy SF equirectangular strip crop: 90-degree width, 45-degree spacing.
This is a rectangular panorama crop, not a rectilinear perspective projection.
"""

from PIL import Image

DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315]
DIR_NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
FOV_DEG = 90
CROP_SIZE = 256


def crop8(pano: Image.Image, compass: float):
    W, H = pano.size
    crop_h = W // 4
    y0 = (H - crop_h) // 2
    strip = pano.crop((0, y0, W, y0 + crop_h))
    half_w = int((FOV_DEG / 360) * W / 2)
    crops = {}
    for bearing, name in zip(DIRECTIONS, DIR_NAMES):
        offset = (bearing - compass + 180) % 360 - 180
        xc = int((offset / 360 + 0.5) * W) % W
        x0, x1 = xc - half_w, xc + half_w
        if x0 < 0:
            left = strip.crop((W + x0, 0, W, crop_h))
            right = strip.crop((0, 0, x1, crop_h))
            tile = Image.new("RGB", (x1 - x0, crop_h))
            tile.paste(left, (0, 0))
            tile.paste(right, (left.width, 0))
        elif x1 > W:
            left = strip.crop((x0, 0, W, crop_h))
            right = strip.crop((0, 0, x1 - W, crop_h))
            tile = Image.new("RGB", (x1 - x0, crop_h))
            tile.paste(left, (0, 0))
            tile.paste(right, (left.width, 0))
        else:
            tile = strip.crop((x0, 0, x1, crop_h))
        crops[name] = tile.resize((CROP_SIZE, CROP_SIZE), Image.LANCZOS)
    return crops
