from collections import deque
from pathlib import Path
from PIL import Image, ImageOps

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / 'public/images/app-icon-source.jpg'
RES = PROJECT_ROOT / 'android/app/src/main/res'

# Android legacy launcher densities used by the explicit manifest icon resources.
DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

image = Image.open(SOURCE).convert('RGBA')
# Remove only near-white pixels connected to the outside border. This clears the
# source's white margin and rounded-corner wedges while preserving white stars
# enclosed by the dark space artwork.
rgb = image.convert('RGB')
width, height = rgb.size
pixels = rgb.load()
near_white = lambda x, y: all(channel >= 245 for channel in pixels[x, y])
transparent = set()
queue = deque()

def enqueue(x, y):
    point = (x, y)
    if point not in transparent and near_white(x, y):
        transparent.add(point)
        queue.append(point)

for x in range(width):
    enqueue(x, 0)
    enqueue(x, height - 1)
for y in range(height):
    enqueue(0, y)
    enqueue(width - 1, y)

while queue:
    x, y = queue.popleft()
    for nx in range(max(0, x - 1), min(width, x + 2)):
        for ny in range(max(0, y - 1), min(height, y + 2)):
            enqueue(nx, ny)

alpha = Image.new('L', (width, height), 255)
for x, y in transparent:
    alpha.putpixel((x, y), 0)
image.putalpha(alpha)
bbox = alpha.getbbox()
if bbox is None:
    raise RuntimeError('Could not locate non-white logo artwork')

artwork = image.crop(bbox)
side = max(artwork.width, artwork.height)
transparent_canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
transparent_canvas.alpha_composite(artwork, ((side - artwork.width) // 2, (side - artwork.height) // 2))

# Legacy launcher icons use transparent corners instead of the source image's
# white margin, so Android will not render a white square behind the artwork.
for density, size in DENSITIES.items():
    target = ImageOps.contain(transparent_canvas, (size, size), method=Image.Resampling.LANCZOS)
    square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    square.alpha_composite(target, ((size - target.width) // 2, (size - target.height) // 2))
    for filename in ('ethio_telescope_launcher.png', 'ethio_telescope_launcher_round.png'):
        output = RES / f'mipmap-{density}' / filename
        output.parent.mkdir(parents=True, exist_ok=True)
        square.save(output, format='PNG', optimize=True)

# Adaptive-icon foreground is transparent around the artwork so Android's
# launcher mask, not a white source margin, controls the final shape.
foreground_size = 432
foreground_target = ImageOps.contain(transparent_canvas, (foreground_size, foreground_size), method=Image.Resampling.LANCZOS)
foreground = Image.new('RGBA', (foreground_size, foreground_size), (0, 0, 0, 0))
foreground.alpha_composite(foreground_target, ((foreground_size - foreground_target.width) // 2, (foreground_size - foreground_target.height) // 2))
foreground_dir = RES / 'drawable-nodpi'
foreground_dir.mkdir(parents=True, exist_ok=True)
foreground.save(foreground_dir / 'ethio_telescope_launcher_foreground.png', format='PNG', optimize=True)

print(f'Prepared launcher icons from {SOURCE.name}; trimmed source bounds={bbox}; square={side}px; transparent margins enabled')
